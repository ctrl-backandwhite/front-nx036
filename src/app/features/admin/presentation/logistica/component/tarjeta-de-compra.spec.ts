import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { CompraAProveedor } from '../../../domain/logistica/model/compra';
import { TarjetaDeCompra } from './tarjeta-de-compra';

/**
 * La tarjeta de una compra a proveedor en el tablero de compras.
 *
 * <p>Es una tarjeta de solo lectura salvo por un botón: el que la empuja al siguiente paso. Y ese botón
 * es lo que hay que fijar, porque **cuál toca depende del estado** y equivocarse salta un paso del flujo
 * —marcar «recibido» algo que aún no se ha comprado— sin que nada lo impida después.
 *
 * <p>Lo otro es el aviso de los días en almacén: a los treinta el almacén DESTRUYE la mercancía, así que
 * a partir del vigésimo la cifra se pinta en rojo. No es decoración: es la única señal de que queda poco
 * para perder el pedido.
 */
function compra(parcial: Partial<CompraAProveedor> = {}): CompraAProveedor {
  return {
    id: 'cp1',
    pedidoId: 'o1',
    numeroDePedido: 'NX-1024',
    estado: 'PENDING',
    proveedor: 'Yiwu Textiles',
    lineas: [],
    ...parcial,
  };
}

async function monta(datos: CompraAProveedor, ocupado = false) {
  const pedidos: string[] = [];
  const copiado = vi.fn();

  const vista = await render(TarjetaDeCompra, {
    inputs: { compra: datos, ocupado },
    on: { pide: (paso: string) => pedidos.push(paso), copia: copiado },
  });
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();

  return { vista, pedidos, copiado };
}

describe('TarjetaDeCompra', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  describe('el paso que toca', () => {
    /* Cada estado ofrece SU paso, y solo ese: el rótulo cambia porque la acción es distinta —comprar,
     * registrar el envío del proveedor, recibir en almacén, re-empaquetar—. */
    it.each([
      ['PENDING', 'Marcar comprado'],
      ['PURCHASED', 'Registrar envío del proveedor'],
      ['IN_TRANSIT', 'Marcar recibido en almacén'],
      ['AT_WAREHOUSE', 'Registrar re-empaquetado'],
    ] as const)('con estado %s se ofrece «%s»', async (estado, rotulo) => {
      await monta(compra({ estado: estado as CompraAProveedor['estado'] }));

      expect(screen.getByRole('button', { name: rotulo })).toBeInTheDocument();
    });

    /** Empaquetado es el final del flujo: no hay siguiente paso que ofrecer. */
    it('una compra ya empaquetada no ofrece ningún paso más', async () => {
      await monta(compra({ estado: 'PACKED' }));

      expect(screen.queryByRole('button', { name: /Marcar|Registrar/ })).toBeNull();
    });

    it('el paso pedido se comunica hacia arriba, que es quien lo ejecuta', async () => {
      const { pedidos } = await monta(compra({ estado: 'PENDING' }));

      await userEvent.click(screen.getByRole('button', { name: 'Marcar comprado' }));

      expect(pedidos).toEqual(['bought']);
    });

    it('mientras hay algo en curso, el botón no se puede volver a pulsar', async () => {
      await monta(compra({ estado: 'PENDING' }), true);

      /* Pulsar dos veces avanzaría el flujo dos pasos de golpe. */
      expect(screen.getByRole('button', { name: 'Marcar comprado' })).toBeDisabled();
    });
  });

  it('cancelar la compra se comunica hacia arriba', async () => {
    const { pedidos } = await monta(compra());

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar compra' }));

    expect(pedidos).toEqual(['cancel']);
  });

  describe('la dirección del almacén', () => {
    /** Se copia porque hay que pegarla en 1688: teclear una dirección china a mano es un error seguro. */
    it('se ofrece copiar cuando la compra está pendiente y hay dirección', async () => {
      const { copiado } = await monta(
        compra({ estado: 'PENDING', direccionDeAlmacen: '浙江省义乌市...' }),
      );

      await userEvent.click(screen.getByRole('button', { name: /Copiar dirección/ }));

      expect(copiado).toHaveBeenCalled();
    });

    it('y no se ofrece cuando la compra ya salió de ese punto', async () => {
      await monta(compra({ estado: 'PURCHASED', direccionDeAlmacen: '浙江省义乌市...' }));

      expect(screen.queryByRole('button', { name: /Copiar dirección/ })).toBeNull();
    });
  });

  describe('re-exportar la hoja', () => {
    it('se ofrece cuando ya se exportó y todavía no está empaquetada', async () => {
      await monta(compra({ estado: 'PURCHASED', exportadoEl: '2026-09-01' }));

      expect(screen.getByRole('button', { name: /Volver a exportar/ })).toBeInTheDocument();
    });

    /** Empaquetada, la hoja ya cumplió: reexportarla solo confundiría al almacén. */
    it('pero NO cuando ya está empaquetada', async () => {
      await monta(compra({ estado: 'PACKED', exportadoEl: '2026-09-01' }));

      expect(screen.queryByRole('button', { name: /Volver a exportar/ })).toBeNull();
    });

    it('ni antes de haberla exportado nunca', async () => {
      await monta(compra({ estado: 'PURCHASED' }));

      expect(screen.queryByRole('button', { name: /Volver a exportar/ })).toBeNull();
    });
  });

  describe('los días en almacén', () => {
    /** A los treinta el almacén destruye la mercancía: el rojo es la única señal de que queda poco. */
    it('a partir del aviso, la cifra se pinta en rojo', async () => {
      const { vista } = await monta(compra({ diasEnAlmacen: 22 }));

      expect(vista.fixture.nativeElement.querySelector('.text-red-600')).not.toBeNull();
    });

    it('y con margen de sobra, no', async () => {
      const { vista } = await monta(compra({ diasEnAlmacen: 3 }));

      expect(vista.fixture.nativeElement.querySelector('.text-red-600')).toBeNull();
    });

    /** Sin dato no se pinta un «0 / 30», que se leería como recién llegada. */
    it('sin dato de días no se pinta ninguna cuenta', async () => {
      await monta(compra());

      expect(screen.queryByText(/\/ 30/)).toBeNull();
    });
  });

  it('enseña los importes que manda el servidor, sin recomponerlos', async () => {
    await monta(
      compra({
        costeEsperadoFormateado: '123,00 €',
        costeRealFormateado: '130,00 €',
        desviacionFormateada: '+7,00 €',
        fueraDePresupuesto: true,
      }),
    );

    /* Se enseñan los del servidor para que coincidan exactamente con lo que se liquida. */
    expect(screen.getByText('123,00 €')).toBeInTheDocument();
    expect(screen.getByText('130,00 €')).toBeInTheDocument();
    expect(screen.getByText('+7,00 €')).toBeInTheDocument();
  });
});
