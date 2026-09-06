import { provideRouter } from '@angular/router';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import {
  MovimientoDeCartera,
  ResumenDeCartera,
} from '../../../domain/gestion/model/carteras';
import { Pagina } from '../../../domain/gestion/model/pagina';
import { CARTERAS_PORT } from '../../../domain/gestion/port/carteras.port';
import { TIPOS_DE_CAMBIO_PORT } from '../../../domain/gestion/port/tipos-de-cambio.port';
import {
  AjustaLaCartera,
  BuscaCarteras,
  ConsultaLaCartera,
  ConsultaMovimientos,
  IngresaEnLaCartera,
  ReindexaCarteras,
} from '../../../application/gestion/use-case/carteras.use-case';
import { ImportesStore } from '../../../application/gestion/state/importes.store';
import { CarterasPage } from './carteras.page';

/**
 * El plazo de cada prueba, ampliado.
 *
 * <p>NO es que la pantalla sea lenta: los fallos que aparecían eran «Test timed out in 5000ms» en
 * pruebas DISTINTAS en cada pasada, y en solitario todas pasan. La causa es la máquina —varios equipos
 * compilando el mismo proyecto a la vez—, y un plazo que depende de la carga convierte una batería
 * correcta en una moneda al aire. Las consultas caras ya se cambiaron por otras baratas; esto es lo que
 * queda, y es lo mismo que hicieron los demás equipos del panel.
 */
vi.setConfig({ testTimeout: 30_000 });

/**
 * Español y EUROS a propósito: con la divisa activa distinta del dólar se puede comprobar que la columna
 * «Moneda» enseña en qué se está pintando el saldo y no el código interno del monedero, que es siempre
 * el dólar. Con las dos coincidiendo, la prueba no distinguiría un caso del otro.
 */
function enEspanolYEuros(): void {
  document.cookie = 'nx036-locale=es';
  document.cookie = 'nx036-currency=EUR';
}

/** Los campos de importe son numéricos: en jsdom no admiten selección, así que se escriben de golpe. */
function escribe(campo: HTMLElement, valor: string): void {
  fireEvent.input(campo, { target: { value: valor } });
}

const cartera = (parcial: Partial<ResumenDeCartera> = {}): ResumenDeCartera => ({
  id: 'w1',
  idUsuario: 'u1',
  email: 'ana@marca.com',
  nombre: 'Ana Ruiz',
  saldoUsd: 120.5,
  retenidoUsd: 0,
  estado: 'ACTIVE',
  ...parcial,
});

const paginaDe = <T,>(elementos: readonly T[]): Pagina<T> => ({
  elementos,
  total: elementos.length,
  paginas: 1,
  pagina: 0,
});

const movimiento = (parcial: Partial<MovimientoDeCartera> = {}): MovimientoDeCartera => ({
  id: 'm1',
  clase: 'DEPOSIT',
  importeCentimos: 5000,
  saldoResultanteCentimos: 12050,
  descripcion: 'Admin manual top-up',
  idPedido: null,
  creadoEl: '2026-05-10T12:00:00Z',
  ...parcial,
});

describe('CarterasPage', () => {
  const puerto = {
    busca: vi.fn(),
    detalle: vi.fn(),
    movimientos: vi.fn(),
    deposita: vi.fn(),
    ajusta: vi.fn(),
    reindexa: vi.fn(),
  };
  const avisos = { exito: vi.fn(), error: vi.fn(), muestra: vi.fn() };

  const monta = () =>
    render(CarterasPage, {
      providers: [
        provideRouter([]),
        { provide: CARTERAS_PORT, useValue: puerto },
        // Sin tasas se formatea en dólares sin convertir, que es el comportamiento declarado del almacén.
        { provide: TIPOS_DE_CAMBIO_PORT, useValue: { vigentes: async () => exito([]) } },
        { provide: AvisosStore, useValue: avisos },
        ImportesStore,
        BuscaCarteras,
        ConsultaLaCartera,
        ConsultaMovimientos,
        IngresaEnLaCartera,
        AjustaLaCartera,
        ReindexaCarteras,
      ],
    });

  beforeEach(() => {
    enEspanolYEuros();
    vi.resetAllMocks();
    puerto.busca.mockResolvedValue(exito(paginaDe([cartera()])));
  });

  it('enseña cada cartera con su correo y su saldo ya escrito', async () => {
    await monta();

    expect(await screen.findByText('ana@marca.com')).toBeInTheDocument();
    expect(screen.getByText('Ana Ruiz')).toBeInTheDocument();
    expect(screen.getByText('Activo')).toBeInTheDocument();
  });

  /**
   * La columna «Moneda» dice en qué divisa se está RENDERIZANDO el saldo, no el código interno del
   * monedero —que siempre es el dólar—. Enseñar «USD» junto a un importe ya convertido a euros era decir
   * dos cosas incompatibles en la misma fila.
   */
  it('la columna de moneda enseña la divisa activa, no la del monedero', async () => {
    await monta();
    await screen.findByText('ana@marca.com');

    const filas = screen.getAllByRole('row');
    expect(within(filas[1]).getByText('EUR')).toBeInTheDocument();
  });

  /** Un «0,00 €» en «Retenido» se lee como una retención de cero, que no es no tener ninguna. */
  it('sin retención la columna queda con una raya, no con un cero', async () => {
    await monta();
    await screen.findByText('ana@marca.com');

    const filas = screen.getAllByRole('row');
    expect(within(filas[1]).getByText('—')).toBeInTheDocument();
  });

  it('sin ninguna cartera lo dice con su propio vacío', async () => {
    puerto.busca.mockResolvedValue(exito(paginaDe([])));

    await monta();

    expect(await screen.findByText('No hay wallets que mostrar')).toBeInTheDocument();
  });

  it('si la lectura falla se explica con el mensaje del servidor', async () => {
    puerto.busca.mockResolvedValue(fallo(creaError('sin-conexion', 'No hay red')));

    await monta();

    await waitFor(() => expect(avisos.error).toHaveBeenCalledWith('No hay red'));
  });

  /** Un depósito de cero no mueve saldo y solo deja un apunte mudo en el libro mayor. */
  it('el depósito no se puede enviar sin importe', async () => {
    await monta();
    await screen.findByText('ana@marca.com');
    await userEvent.click(screen.getByRole('button', { name: /^Recargar · ana@marca.com$/ }));

    const ventana = await screen.findByRole('dialog');
    expect(within(ventana).getByRole('button', { name: 'Recargar' })).toBeDisabled();
  });

  it('el depósito viaja en céntimos y por el identificador del usuario', async () => {
    puerto.deposita.mockResolvedValue(exito(undefined));

    await monta();
    await screen.findByText('ana@marca.com');
    await userEvent.click(screen.getByRole('button', { name: /^Recargar · ana@marca.com$/ }));
    const ventana = await screen.findByRole('dialog');
    escribe(within(ventana).getByLabelText('Importe (USD)'), '25.00');
    await userEvent.click(within(ventana).getByRole('button', { name: 'Recargar' }));

    await waitFor(() =>
      expect(puerto.deposita).toHaveBeenCalledWith({ idUsuario: 'u1', importeCentimos: 2500 }),
    );
    expect(avisos.exito).toHaveBeenCalledWith('Recarga aplicada correctamente.');
  });

  /**
   * El AJUSTE lleva signo y el motivo es OBLIGATORIO: el apunte queda en el libro mayor y alguien tendrá
   * que explicarlo cuando un cliente pregunte por qué le falta dinero.
   */
  it('el ajuste exige motivo aunque haya importe', async () => {
    await monta();
    await screen.findByText('ana@marca.com');
    await userEvent.click(screen.getByRole('button', { name: /^Ajustar saldo · ana@marca.com$/ }));

    const ventana = await screen.findByRole('dialog');
    escribe(within(ventana).getByLabelText(/Importe \(USD\)/), '-10');
    expect(within(ventana).getByRole('button', { name: 'Aplicar ajuste' })).toBeDisabled();

    await userEvent.type(within(ventana).getByLabelText('Motivo (obligatorio)'), 'Artículo roto');
    expect(within(ventana).getByRole('button', { name: 'Aplicar ajuste' })).toBeEnabled();
  });

  it('el ajuste negativo viaja con su signo y su motivo', async () => {
    puerto.ajusta.mockResolvedValue(exito(undefined));

    await monta();
    await screen.findByText('ana@marca.com');
    await userEvent.click(screen.getByRole('button', { name: /^Ajustar saldo · ana@marca.com$/ }));
    const ventana = await screen.findByRole('dialog');
    escribe(within(ventana).getByLabelText(/Importe \(USD\)/), '-10');
    await userEvent.type(within(ventana).getByLabelText('Motivo (obligatorio)'), 'Artículo roto');
    await userEvent.click(within(ventana).getByRole('button', { name: 'Aplicar ajuste' }));

    await waitFor(() =>
      expect(puerto.ajusta).toHaveBeenCalledWith({
        idUsuario: 'u1',
        importeCentimos: -1000,
        descripcion: 'Artículo roto',
      }),
    );
  });

  it('un ajuste rechazado deja la ventana abierta con el motivo del servidor', async () => {
    puerto.ajusta.mockResolvedValue(fallo(creaError('conflicto', 'Cartera congelada')));

    await monta();
    await screen.findByText('ana@marca.com');
    await userEvent.click(screen.getByRole('button', { name: /^Ajustar saldo · ana@marca.com$/ }));
    const ventana = await screen.findByRole('dialog');
    escribe(within(ventana).getByLabelText(/Importe \(USD\)/), '-10');
    await userEvent.type(within(ventana).getByLabelText('Motivo (obligatorio)'), 'Artículo roto');
    await userEvent.click(within(ventana).getByRole('button', { name: 'Aplicar ajuste' }));

    await waitFor(() => expect(avisos.error).toHaveBeenCalledWith('Cartera congelada'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  /**
   * Las notas del libro mayor llegan del backend en INGLÉS. Traducirlas al pintar es lo único que evita
   * un histórico bilingüe; el vistazo se pide por el identificador de la CARTERA, no por el del usuario.
   */
  it('el historial traduce las notas del backend y se pide por la cartera', async () => {
    puerto.movimientos.mockResolvedValue(exito(paginaDe([movimiento()])));

    await monta();
    await screen.findByText('ana@marca.com');
    await userEvent.click(screen.getByRole('button', { name: /^Historial · ana@marca.com$/ }));

    expect(await screen.findByText('Recarga manual')).toBeInTheDocument();
    expect(puerto.movimientos).toHaveBeenCalledWith('w1', 0, 30);
  });

  it('un historial vacío lo dice en vez de dejar la tabla en blanco', async () => {
    puerto.movimientos.mockResolvedValue(exito(paginaDe([])));

    await monta();
    await screen.findByText('ana@marca.com');
    await userEvent.click(screen.getByRole('button', { name: /^Historial · ana@marca.com$/ }));

    expect(await screen.findByText('Sin movimientos todavía.')).toBeInTheDocument();
  });

  it('si el historial falla se avisa y no se queda cargando para siempre', async () => {
    puerto.movimientos.mockResolvedValue(fallo(creaError('no-encontrado', 'No existe')));

    await monta();
    await screen.findByText('ana@marca.com');
    await userEvent.click(screen.getByRole('button', { name: /^Historial · ana@marca.com$/ }));

    await waitFor(() => expect(avisos.error).toHaveBeenCalledWith('No existe'));
    expect(await screen.findByText('Sin movimientos todavía.')).toBeInTheDocument();
  });

  it('reindexar dice cuántos registros se tocaron', async () => {
    puerto.reindexa.mockResolvedValue(exito(42));

    await monta();
    await screen.findByText('ana@marca.com');
    await userEvent.click(screen.getByRole('button', { name: /Reindexar/ }));

    await waitFor(() => expect(avisos.exito).toHaveBeenCalledWith('Reindexados 42 registros.'));
  });

  it('si el reindexado falla se dice, y no se pinta un éxito falso', async () => {
    puerto.reindexa.mockResolvedValue(fallo(creaError('error-del-servidor')));

    await monta();
    await screen.findByText('ana@marca.com');
    await userEvent.click(screen.getByRole('button', { name: /Reindexar/ }));

    await waitFor(() => expect(avisos.error).toHaveBeenCalledWith('Falló el reindexado.'));
    expect(avisos.exito).not.toHaveBeenCalled();
  });

  it('la fila enlaza al detalle de la cartera por el usuario, no a su ficha de cuenta', async () => {
    await monta();
    await screen.findByText('ana@marca.com');

    const enlace = screen.getByRole('link', { name: 'Entrar al wallet · ana@marca.com' });
    expect(enlace).toHaveAttribute('href', '/admin/wallets/u1');
  });
});
