import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { ConsultaCartera } from '../../application/use-case/consulta-cartera.use-case';
import { ConsultaComisionesPendientes } from '../../application/use-case/consulta-comisiones-pendientes.use-case';
import { CarteraPage } from './cartera.page';

/**
 * Las pruebas se corren en español: el idioma sale de la cookie de preferencias y, sin ella, el
 * navegador de las pruebas pide inglés.
 */
function enEspanol(): void {
  document.cookie = 'nx036-locale=es';
}

const CARTERA = {
  id: 'w1',
  saldoFormateado: '42,50 €',
  divisaMostrada: 'EUR',
  saldoCanonicoFormateado: '$46.00',
  retenidoFormateado: '',
};

describe('CarteraPage', () => {
  const consulta = { ejecuta: vi.fn(), ultimosMovimientos: vi.fn() };
  const comisiones = { ejecuta: vi.fn() };

  const monta = () =>
    render(CarteraPage, {
      providers: [
        provideRouter([]),
        { provide: ConsultaCartera, useValue: consulta },
        { provide: ConsultaComisionesPendientes, useValue: comisiones },
      ],
    });

  beforeEach(() => {
    enEspanol();
    vi.resetAllMocks();
    consulta.ejecuta.mockResolvedValue(exito(CARTERA));
    consulta.ultimosMovimientos.mockResolvedValue(exito({ movimientos: [], total: 0 }));
    comisiones.ejecuta.mockResolvedValue(
      exito({ esAfiliado: false, totalFormateado: '', comisiones: [] }),
    );
  });

  it('enseña el saldo tal y como lo formateó el backend', async () => {
    await monta();

    expect(await screen.findByText(/42,50 €/)).toBeInTheDocument();
    expect(screen.getByText('$46.00')).toBeInTheDocument();
  });

  /** Un «Retenido: 0,00 $» inquieta sin motivo. */
  it('no habla de lo retenido cuando no hay nada retenido', async () => {
    await monta();
    await screen.findByText(/42,50 €/);

    expect(screen.queryByText(/Retenido/)).toBeNull();
  });

  it('enseña lo retenido cuando lo hay', async () => {
    consulta.ejecuta.mockResolvedValue(exito({ ...CARTERA, retenidoFormateado: '$5.00' }));

    await monta();

    expect(await screen.findByText(/Retenido/)).toBeInTheDocument();
  });

  it('sin movimientos lo dice, en vez de dejar la tabla muda', async () => {
    await monta();

    expect(await screen.findByText('Sin movimientos. Recarga tu wallet para empezar.')).toBeInTheDocument();
  });

  it('pinta los movimientos con el importe ya formateado', async () => {
    consulta.ultimosMovimientos.mockResolvedValue(
      exito({
        total: 1,
        movimientos: [
          {
            id: 't1',
            clase: 'DEPOSIT',
            importeFormateado: '+10,00 €',
            saldoPosteriorFormateado: '10,00 €',
            esEntrada: true,
            creadoEl: '2026-09-01T10:00:00Z',
          },
        ],
      }),
    );

    await monta();

    expect(await screen.findByText('+10,00 €')).toBeInTheDocument();
  });

  /**
   * Las comisiones son decorado: quien no es afiliado recibe un rechazo del servidor y eso no puede
   * impedir que se vea el saldo.
   */
  it('un rechazo de las comisiones no impide ver la cartera', async () => {
    comisiones.ejecuta.mockResolvedValue(fallo(creaError('sin-permiso')));

    await monta();

    expect(await screen.findByText(/42,50 €/)).toBeInTheDocument();
    expect(screen.queryByText('Comisiones de afiliado pendientes')).toBeNull();
  });

  it('enseña las comisiones pendientes con su cuenta atrás', async () => {
    const dentroDeTresDias = new Date(Date.now() + 3 * 86_400_000).toISOString();
    comisiones.ejecuta.mockResolvedValue(
      exito({
        esAfiliado: true,
        totalFormateado: '12,50 €',
        comisiones: [{ id: 'c1', importeFormateado: '10,00 €', apruebaEl: dentroDeTresDias }],
      }),
    );

    await monta();

    expect(await screen.findByText('+10,00 €')).toBeInTheDocument();
    expect(screen.getByText(/3/)).toBeInTheDocument();
  });

  it('un fallo del saldo deja la pantalla sin cifra, sin romperse', async () => {
    consulta.ejecuta.mockResolvedValue(fallo(creaError('sin-conexion')));

    await monta();

    expect(await screen.findByText('Sin movimientos. Recarga tu wallet para empezar.')).toBeInTheDocument();
  });
});
