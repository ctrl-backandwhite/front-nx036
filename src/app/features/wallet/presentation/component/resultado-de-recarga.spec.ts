import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { Recarga } from '../../domain/model/recarga';
import { ResultadoDeRecarga } from './resultado-de-recarga';

/**
 * Lo que se enseña después de pedir una recarga, según por dónde se vaya a pagar.
 *
 * <p>Lo importante aquí es que la pasarela DE MENTIRA se distinga de la de verdad. El botón de «dar el
 * cobro por bueno» solo tiene sentido cuando el proveedor está simulado; si apareciera con una pasarela
 * real sería un botón para acreditar saldo sin haber cobrado nada, y esta pantalla la ve cualquier
 * cliente.
 *
 * <p>Y en cripto, el aviso de la RED. Enviar USDT por una cadena distinta de la indicada pierde el
 * dinero sin vuelta atrás, así que el aviso lleva el nombre de la cadena concreta, no una advertencia
 * genérica que nadie lee.
 */
function recarga(parcial: Partial<Recarga> = {}): Recarga {
  return {
    idDePago: 'pay_1',
    metodo: 'CARD',
    estado: 'REQUIRES_ACTION',
    importeFormateado: '50,00 €',
    divisaDeCobro: 'EUR',
    proveedor: 'stripe',
    ...parcial,
  };
}

async function monta(datos: Recarga, confirmando = false) {
  const confirmado = vi.fn();
  const vista = await render(ResultadoDeRecarga, {
    inputs: { recarga: datos, confirmando },
    on: { confirma: confirmado },
  });
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();
  return { vista, confirmado };
}

describe('ResultadoDeRecarga', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('confirma que el pago está en marcha, con su importe', async () => {
    await monta(recarga());

    expect(screen.getByText(/Pago iniciado/)).toBeInTheDocument();
    expect(screen.getByText(/50,00 €/)).toBeInTheDocument();
  });

  describe('tarjeta', () => {
    /** Con Stripe de verdad no hay botón de «darlo por bueno»: eso sería acreditar saldo sin cobrar. */
    it('con la pasarela REAL no se ofrece dar el cobro por bueno', async () => {
      await monta(recarga({ secretoDeCliente: 'pi_1_secret_abc' }));

      expect(screen.getByText(/Confirma el pago con Stripe Elements/)).toBeInTheDocument();
      expect(screen.queryByRole('button')).toBeNull();
    });

    it('con la pasarela SIMULADA sí, y avisa de que lo está', async () => {
      const { confirmado } = await monta(recarga({ secretoDeCliente: 'pi_mock_secret' }));

      expect(screen.getByText(/Stripe está en modo mock/)).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button'));
      expect(confirmado).toHaveBeenCalled();
    });

    it('mientras confirma, el botón no se puede volver a pulsar', async () => {
      await monta(recarga({ secretoDeCliente: 'pi_mock_secret' }), true);

      /* Pulsar dos veces acreditaría el saldo dos veces: es el mismo doble gasto que se persigue en el
       * resto del monedero. */
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('PayPal', () => {
    it('con la pasarela real lleva al enlace de aprobación', async () => {
      await monta(
        recarga({
          metodo: 'PAYPAL',
          proveedor: 'paypal',
          urlDeAprobacion: 'https://paypal.com/checkoutnow?token=abc',
        }),
      );

      expect(screen.getByRole('link', { name: /Continuar en PayPal/ })).toHaveAttribute(
        'href',
        'https://paypal.com/checkoutnow?token=abc',
      );
    });

    it('con la simulada no hay enlace: hay botón de darlo por bueno', async () => {
      const { confirmado } = await monta(
        recarga({
          metodo: 'PAYPAL',
          proveedor: 'paypal',
          urlDeAprobacion: 'https://paypal.com/x?mock=1',
        }),
      );

      expect(screen.queryByRole('link', { name: /Continuar en PayPal/ })).toBeNull();
      await userEvent.click(screen.getByRole('button'));
      expect(confirmado).toHaveBeenCalled();
    });
  });

  describe('cripto', () => {
    const CRIPTO = recarga({
      metodo: 'USDT',
      proveedor: 'manual',
      direccionCripto: 'TXk9...9fA',
      cadenaCripto: 'TRC20',
    });

    /** Enviar por otra cadena pierde el dinero: el aviso lleva la cadena concreta, no una genérica. */
    it('el aviso nombra la RED por la que hay que enviar', async () => {
      await monta(CRIPTO);

      expect(screen.getByText(/Envía únicamente USDT en red TRC20/)).toBeInTheDocument();
      expect(screen.getByText('TXk9...9fA')).toBeInTheDocument();
    });

    it('la dirección se copia al portapapeles', async () => {
      const escribe = vi.fn(async () => undefined);
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: escribe },
      });
      await monta(CRIPTO);

      await userEvent.click(screen.getByRole('button', { name: /Copiar/ }));

      expect(escribe).toHaveBeenCalledWith('TXk9...9fA');
    });

    /**
     * El navegador deniega el portapapeles sin TLS, sin permiso o dentro de un marco. Que falle no puede
     * dejar una promesa rechazada suelta: quien copia una dirección de criptomoneda la comprueba antes
     * de enviar, así que lo grave sería el error no atendido, no el fallo al copiar.
     */
    it('si el navegador lo deniega, no revienta', async () => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async () => {
            throw new Error('denegado');
          },
        },
      });
      await monta(CRIPTO);

      await expect(
        userEvent.click(screen.getByRole('button', { name: /Copiar/ })),
      ).resolves.not.toThrow();
    });
  });
});
