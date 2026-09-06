import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { IniciaRecarga } from '../../application/use-case/inicia-recarga.use-case';
import { ConfirmaRecarga } from '../../application/use-case/confirma-recarga.use-case';
import { RecargaPage } from './recarga.page';

function enEspanol(): void {
  document.cookie = 'nx036-locale=es';
}

const OPCIONES = {
  divisa: 'EUR',
  simbolo: '€',
  sugeridos: [{ importe: 50, formateado: '50,00 €' }],
};

const RECARGA_SIMULADA = {
  idDePago: 'p1234567890',
  metodo: 'CARD' as const,
  estado: 'PENDING',
  importeFormateado: '50,00 €',
  divisaDeCobro: 'EUR',
  proveedor: 'manual',
  secretoDeCliente: 'cs_mock_abc',
};

describe('RecargaPage', () => {
  const inicia = { opciones: vi.fn(), ejecuta: vi.fn() };
  const confirma = { simulada: vi.fn(), ejecuta: vi.fn() };

  const monta = () =>
    render(RecargaPage, {
      providers: [
        provideRouter([]),
        { provide: IniciaRecarga, useValue: inicia },
        { provide: ConfirmaRecarga, useValue: confirma },
      ],
    });

  /** Deja la pantalla en el paso del importe, que es donde ocurre casi todo. */
  async function enElPasoDelImporte() {
    const vista = await monta();
    await userEvent.click(await screen.findByRole('button', { name: 'Siguiente' }));
    return vista;
  }

  beforeEach(() => {
    enEspanol();
    vi.resetAllMocks();
    inicia.opciones.mockResolvedValue(exito(OPCIONES));
  });

  it('empieza pidiendo con qué se quiere pagar', async () => {
    await monta();

    expect(await screen.findByLabelText(/Tarjeta/)).toBeInTheDocument();
    expect(screen.getByLabelText(/PayPal/)).toBeInTheDocument();
  });

  it('enseña los importes sugeridos que redondeó el backend', async () => {
    await enElPasoDelImporte();

    expect(await screen.findByRole('button', { name: '50,00 €' })).toBeInTheDocument();
  });

  /** Sin importe válido no se puede continuar: viajaría una recarga sin cantidad. */
  it('el botón de continuar está apagado mientras no haya un importe válido', async () => {
    await enElPasoDelImporte();

    expect(await screen.findByRole('button', { name: /Continuar con/ })).toBeDisabled();
  });

  it('un importe sugerido enciende el botón de continuar', async () => {
    await enElPasoDelImporte();
    await userEvent.click(await screen.findByRole('button', { name: '50,00 €' }));

    expect(screen.getByRole('button', { name: /Continuar con/ })).toBeEnabled();
  });

  /**
   * Un rechazo silencioso dejaba la pantalla igual que antes de pulsar y el cliente lo intentaba una y
   * otra vez: el camino corto a dos cobros por la misma recarga.
   */
  it('enseña el motivo cuando el servidor rechaza la recarga', async () => {
    inicia.ejecuta.mockResolvedValue(fallo(creaError('peticion-invalida', 'Importe fuera de rango')));

    await enElPasoDelImporte();
    await userEvent.click(await screen.findByRole('button', { name: '50,00 €' }));
    await userEvent.click(screen.getByRole('button', { name: /Continuar con/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Importe fuera de rango');
  });

  it('sin pasarela real ofrece dar el cobro por bueno', async () => {
    inicia.ejecuta.mockResolvedValue(exito(RECARGA_SIMULADA));

    await enElPasoDelImporte();
    await userEvent.click(await screen.findByRole('button', { name: '50,00 €' }));
    await userEvent.click(screen.getByRole('button', { name: /Continuar con/ }));

    expect(await screen.findByText(/50,00 €/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Simular/ })).toBeInTheDocument();
  });

  /** Quien acaba de pulsar cree que ha pagado: callar el fallo es dejarle creer que tiene saldo. */
  it('avisa si la confirmación simulada falla', async () => {
    inicia.ejecuta.mockResolvedValue(exito(RECARGA_SIMULADA));
    confirma.simulada.mockResolvedValue(fallo(creaError('conflicto', 'Pago ya cerrado')));

    await enElPasoDelImporte();
    await userEvent.click(await screen.findByRole('button', { name: '50,00 €' }));
    await userEvent.click(screen.getByRole('button', { name: /Continuar con/ }));
    await userEvent.click(await screen.findByRole('button', { name: /Simular/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Pago ya cerrado');
  });

  it('sin importes sugeridos la recarga sigue funcionando a mano', async () => {
    inicia.opciones.mockResolvedValue(fallo(creaError('sin-conexion')));

    await enElPasoDelImporte();
    await userEvent.type(await screen.findByLabelText(/Importe en/), '25');

    expect(screen.getByRole('button', { name: /Continuar con/ })).toBeEnabled();
  });
});
