import { provideRouter } from '@angular/router';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import {
  DetalleDeCartera,
  MovimientoDeCartera,
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
import { CarteraDetallePage } from './cartera-detalle.page';

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

/** El idioma sale de la cookie de preferencias; sin ella el navegador de pruebas pediría inglés. */
function enEspanol(): void {
  document.cookie = 'nx036-locale=es';
}

/** Los campos de importe son numéricos: en jsdom no admiten selección, así que se escriben de golpe. */
function escribe(campo: HTMLElement, valor: string): void {
  fireEvent.input(campo, { target: { value: valor } });
}

const detalle = (parcial: Partial<DetalleDeCartera> = {}): DetalleDeCartera => ({
  id: 'w1',
  idUsuario: 'u1',
  email: 'ana@marca.com',
  nombre: 'Ana Ruiz',
  saldoUsd: 120.5,
  retenidoUsd: 20,
  disponibleUsd: 100.5,
  divisa: 'USD',
  estado: 'ACTIVE',
  ...parcial,
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

const paginaDe = <T,>(elementos: readonly T[]): Pagina<T> => ({
  elementos,
  total: elementos.length,
  paginas: 1,
  pagina: 0,
});

// El botón de ajustar se busca por su TEXTO y no por su papel con nombre: una consulta por papel que
// falla calcula el nombre accesible de cada elemento del documento antes de rendirse, y como el dato
// llega por una promesa el primer intento siempre falla. Ese intento se come el plazo entero.
describe('CarteraDetallePage', () => {
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
    render(CarteraDetallePage, {
      inputs: { userId: 'u1' },
      providers: [
        provideRouter([]),
        { provide: CARTERAS_PORT, useValue: puerto },
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
    enEspanol();
    vi.resetAllMocks();
    puerto.detalle.mockResolvedValue(exito(detalle()));
    puerto.movimientos.mockResolvedValue(exito(paginaDe([movimiento()])));
  });

  it('enseña los tres saldos de la cartera con su titular', async () => {
    await monta();

    expect(await screen.findByText('ana@marca.com')).toBeInTheDocument();
    expect(screen.getByText('Saldo disponible')).toBeInTheDocument();
    expect(screen.getByText('Retenido')).toBeInTheDocument();
    expect(screen.getByText('Saldo total')).toBeInTheDocument();
  });

  /**
   * La ficha se pide por el USUARIO y los apuntes por la CARTERA. Son dos claves distintas y confundirlas
   * devuelve un 404 que en pantalla se lee como «sin movimientos», que es un vacío muy distinto.
   */
  it('pide la ficha por el usuario y el libro mayor por la cartera', async () => {
    await monta();
    await screen.findByText('ana@marca.com');

    expect(puerto.detalle).toHaveBeenCalledWith('u1');
    await waitFor(() => expect(puerto.movimientos).toHaveBeenCalledWith('w1', 0, 30));
  });

  it('si la cartera no existe lo dice, en vez de enseñar una ficha en blanco', async () => {
    puerto.detalle.mockResolvedValue(fallo(creaError('no-encontrado')));

    await monta();

    expect(await screen.findByText('Wallet no encontrado.')).toBeInTheDocument();
    expect(puerto.movimientos).not.toHaveBeenCalled();
  });

  /** La nota del backend llega en inglés; el histórico no puede quedarse bilingüe. */
  it('traduce al pintar la nota que el backend escribió en inglés', async () => {
    await monta();

    expect(await screen.findByText('Recarga manual')).toBeInTheDocument();
  });

  /** Si el apunte tiene pedido, la referencia es el pedido; la nota solo se usa a falta de él. */
  it('cuando el apunte tiene pedido, la referencia es el pedido', async () => {
    puerto.movimientos.mockResolvedValue(
      exito(paginaDe([movimiento({ idPedido: 'abcdefgh1234', descripcion: 'Order NX-1' })])),
    );

    await monta();

    expect(await screen.findByText('Pedido #abcdefgh')).toBeInTheDocument();
  });

  /** Un cargo se distingue por el signo y no solo por el color: quien no lo percibe también lo lee. */
  it('un movimiento negativo se escribe con su signo', async () => {
    puerto.movimientos.mockResolvedValue(
      exito(paginaDe([movimiento({ importeCentimos: -1000, saldoResultanteCentimos: 11050 })])),
    );

    await monta();
    await screen.findByText('ana@marca.com');

    expect(await screen.findByText(/-\$?10/)).toBeInTheDocument();
  });

  it('sin apuntes lo dice con su propio vacío', async () => {
    puerto.movimientos.mockResolvedValue(exito(paginaDe([])));

    await monta();

    expect(await screen.findByText('Aún no hay movimientos.')).toBeInTheDocument();
  });

  it('si el libro mayor falla se avisa y la tabla queda vacía, no cargando', async () => {
    puerto.movimientos.mockResolvedValue(fallo(creaError('sin-conexion', 'No hay red')));

    await monta();

    await waitFor(() => expect(avisos.error).toHaveBeenCalledWith('No hay red'));
    expect(await screen.findByText('Aún no hay movimientos.')).toBeInTheDocument();
  });

  /** El ajuste lleva SIGNO y motivo OBLIGATORIO: el apunte queda en el libro mayor para siempre. */
  it('el ajuste no se puede aplicar sin motivo', async () => {
    await monta();
    await screen.findByText('ana@marca.com');
    await userEvent.click(screen.getByText('Ajustar saldo'));

    const ventana = await screen.findByRole('dialog');
    escribe(within(ventana).getByLabelText(/Importe \(USD\)/), '-10');
    expect(within(ventana).getByRole('button', { name: 'Aplicar ajuste' })).toBeDisabled();
  });

  it('el ajuste viaja por el usuario de la dirección y relee la ficha entera', async () => {
    puerto.ajusta.mockResolvedValue(exito(undefined));

    await monta();
    await screen.findByText('ana@marca.com');
    await userEvent.click(screen.getByText('Ajustar saldo'));
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
    // El ajuste cambia el saldo Y añade un apunte: enseñar uno sin el otro deja dos historias distintas.
    await waitFor(() => expect(puerto.detalle).toHaveBeenCalledTimes(2));
    expect(avisos.exito).toHaveBeenCalledWith('Ajuste registrado.');
  });

  it('un ajuste rechazado deja la ventana abierta con el motivo del servidor', async () => {
    puerto.ajusta.mockResolvedValue(fallo(creaError('conflicto', 'Cartera congelada')));

    await monta();
    await screen.findByText('ana@marca.com');
    await userEvent.click(screen.getByText('Ajustar saldo'));
    const ventana = await screen.findByRole('dialog');
    escribe(within(ventana).getByLabelText(/Importe \(USD\)/), '-10');
    await userEvent.type(within(ventana).getByLabelText('Motivo (obligatorio)'), 'Artículo roto');
    await userEvent.click(within(ventana).getByRole('button', { name: 'Aplicar ajuste' }));

    await waitFor(() => expect(avisos.error).toHaveBeenCalledWith('Cartera congelada'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('deja volver al listado de carteras', async () => {
    await monta();

    const volver = await screen.findByText('Volver a wallets');
    expect(volver.closest('a')).toHaveAttribute('href', '/admin/wallets');
  });
});
