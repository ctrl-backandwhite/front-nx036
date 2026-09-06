import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import {
  AFILIADOS_PORT, PAGOS_DE_AFILIADOS_PORT,
} from '../../../domain/gestion/port/afiliados.port';
import { TIPOS_DE_CAMBIO_PORT } from '../../../domain/gestion/port/tipos-de-cambio.port';
import {
  Afiliado, ConfiguracionDeAfiliados, PagoPendiente,
} from '../../../domain/gestion/model/afiliados';
import { Pagina } from '../../../domain/gestion/model/pagina';
import {
  ApruebaComisionesVencidas, ApruebaElPago, BuscaAfiliados, CambiaElEstadoDelAfiliado,
  ConsultaElAfiliado, ConsultaLaConfiguracionDeAfiliados, ConsultaPagosPendientes,
  GuardaLaConfiguracionDeAfiliados, PagaAlAfiliado, RechazaElPago, ReindexaAfiliados,
  ResuelveLaRevision,
} from '../../../application/gestion/use-case/afiliados.use-case';
import { ImportesStore } from '../../../application/gestion/state/importes.store';
import { AfiliadosPage } from './afiliados.page';

const afiliado = (parcial: Partial<Afiliado> = {}): Afiliado => ({
  id: 'a1',
  nombre: 'Ana Ruiz',
  email: 'ana@marca.com',
  estado: 'ACTIVE',
  codigos: 2,
  clics: 0,
  conversiones: 0,
  pendienteCentimos: 0,
  aprobadoCentimos: 1000,
  pagadoCentimos: 0,
  ...parcial,
});

const pagina = (elementos: readonly Afiliado[]): Pagina<Afiliado> => ({
  elementos, total: elementos.length, paginas: 1, pagina: 0,
});

const config = (parcial: Partial<ConfiguracionDeAfiliados> = {}): ConfiguracionDeAfiliados => ({
  porcentajePorDefecto: 10,
  ventanaDeAtribucionDias: 30,
  periodoDeDevolucionDias: 14,
  minimoDePagoCentimos: 5000,
  divisa: 'EUR',
  maximoPorPeriodoCentimos: 100000,
  ...parcial,
});

const pago = (parcial: Partial<PagoPendiente> = {}): PagoPendiente => ({
  id: 'p1',
  idAfiliado: 'a1',
  nombre: 'Ana Ruiz',
  importeCentimos: 12300,
  importeFormateado: '123,00 €',
  divisa: 'EUR',
  metodo: 'BANK',
  titular: 'Ana Ruiz',
  iban: 'ES9121000418450200051332',
  comisiones: 3,
  ...parcial,
});

/**
 * Estas pantallas montan tablas enteras y el teclado se simula tecla a tecla: con el resto de equipos
 * compilando a la vez, los cinco segundos por defecto de Vitest se agotan y la prueba falla por el
 * reloj, no por el código. Se les da holgura para que lo que falle sea siempre el comportamiento.
 */
vi.setConfig({ testTimeout: 30_000 });

/**
 * Las pruebas se corren en español: el idioma sale de la cookie de preferencias y, sin ella, el
 * navegador de las pruebas pide inglés. Fijarla deja las comprobaciones sobre el diccionario real.
 */
function enEspanol(): void {
  document.cookie = 'nx036-locale=es';
}

describe('AfiliadosPage', () => {
  const puerto = {
    busca: vi.fn(), detalle: vi.fn(), cambiaEstado: vi.fn(), reindexa: vi.fn(),
    configuracion: vi.fn(), guardaConfiguracion: vi.fn(),
  };
  const pagos = {
    pendientes: vi.fn(), aprueba: vi.fn(), rechaza: vi.fn(), paga: vi.fn(),
    apruebaVencidas: vi.fn(), revisaComision: vi.fn(),
  };
  const dialogo = { confirma: vi.fn(), alerta: vi.fn(), pregunta: vi.fn() };
  const avisos = { exito: vi.fn(), error: vi.fn(), muestra: vi.fn() };

  // El euro vale medio dólar: así se distingue un importe convertido desde la divisa del PROGRAMA de
  // uno que se hubiera dado por dólares sin más.
  const tiposDeCambio = {
    vigentes: async () =>
      exito([
        { codigo: 'USD', nombre: 'Dólar', simbolo: '$', tasaVsUsd: 1, activa: true },
        { codigo: 'EUR', nombre: 'Euro', simbolo: '€', tasaVsUsd: 0.5, activa: true },
      ]),
  };

  const monta = () =>
    render(AfiliadosPage, {
      providers: [
        { provide: AFILIADOS_PORT, useValue: puerto },
        { provide: PAGOS_DE_AFILIADOS_PORT, useValue: pagos },
        { provide: TIPOS_DE_CAMBIO_PORT, useValue: tiposDeCambio },
        { provide: DialogoStore, useValue: dialogo },
        { provide: AvisosStore, useValue: avisos },
        ImportesStore,
        BuscaAfiliados, ConsultaElAfiliado, CambiaElEstadoDelAfiliado, ReindexaAfiliados,
        ConsultaLaConfiguracionDeAfiliados, GuardaLaConfiguracionDeAfiliados,
        ConsultaPagosPendientes, ApruebaElPago, RechazaElPago, PagaAlAfiliado,
        ApruebaComisionesVencidas, ResuelveLaRevision,
      ],
    });

  beforeEach(() => {
    enEspanol();
    vi.resetAllMocks();
    puerto.busca.mockResolvedValue(exito(pagina([afiliado()])));
    puerto.configuracion.mockResolvedValue(exito(config()));
    puerto.detalle.mockResolvedValue(exito({ codigos: [], comisiones: [] }));
    pagos.pendientes.mockResolvedValue(exito([]));
  });

  it('enseña cada afiliado con su nombre y su correo', async () => {
    await monta();

    expect(await screen.findByText('Ana Ruiz')).toBeInTheDocument();
    expect(screen.getByText('ana@marca.com')).toBeInTheDocument();
  });

  /** Sin clics no hay CERO por ciento: es que no hay dato, y un 0 % se lee como «no convierte». */
  it('sin clics la tasa de conversión es una raya, no un cero por ciento', async () => {
    await monta();
    await screen.findByText('Ana Ruiz');

    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });

  it('con clics enseña el porcentaje que convirtió', async () => {
    puerto.busca.mockResolvedValue(exito(pagina([afiliado({ clics: 10, conversiones: 3 })])));

    await monta();

    expect(await screen.findByText('30%')).toBeInTheDocument();
  });

  /**
   * Los importes van en la divisa del PROGRAMA. Con el euro a medio dólar, 10 € son 20 $; si se
   * hubieran dado por dólares saldrían 10 $ y nadie notaría la diferencia hasta cuadrar el banco.
   */
  it('convierte los importes desde la divisa del programa, no desde el dólar', async () => {
    await monta();

    expect(await screen.findByText('$20.00')).toBeInTheDocument();
  });

  it('un fallo al leer deja el listado vacío y lo dice', async () => {
    puerto.busca.mockResolvedValue(fallo(creaError('sin-conexion', 'No hay red')));

    await monta();

    expect(await screen.findByText('Ningún resultado coincide con los filtros')).toBeInTheDocument();
    expect(avisos.error).toHaveBeenCalledWith('No hay red');
  });

  it('filtrar por estado vuelve a preguntar solo por ese estado', async () => {
    await monta();
    await screen.findByText('Ana Ruiz');

    await userEvent.selectOptions(screen.getByLabelText('Estado'), 'PENDING');

    expect(puerto.busca).toHaveBeenLastCalledWith('PENDING', 0, 20);
  });

  it('la solicitud de pago enseña el importe tal y como lo escribió el backend', async () => {
    pagos.pendientes.mockResolvedValue(exito([pago()]));

    await monta();

    expect(await screen.findByText('123,00 €')).toBeInTheDocument();
    expect(screen.getByText('Transferencia bancaria')).toBeInTheDocument();
  });

  /** Una transferencia sin referencia no se puede casar con el apunte del banco cuando alguien reclama. */
  it('aprobar una transferencia sin referencia avisa y no llega al servidor', async () => {
    pagos.pendientes.mockResolvedValue(exito([pago()]));
    dialogo.pregunta.mockResolvedValue('   ');

    await monta();
    await userEvent.click(await screen.findByRole('button', { name: 'Aprobar' }));

    expect(avisos.error).toHaveBeenCalledWith(
      'La referencia es obligatoria para este método de pago.',
    );
    expect(pagos.aprueba).not.toHaveBeenCalled();
  });

  it('aprobar con referencia la manda y vuelve a leer', async () => {
    pagos.pendientes.mockResolvedValue(exito([pago()]));
    dialogo.pregunta.mockResolvedValue('TRF-99');
    pagos.aprueba.mockResolvedValue(exito(undefined));

    await monta();
    await userEvent.click(await screen.findByRole('button', { name: 'Aprobar' }));

    expect(pagos.aprueba).toHaveBeenCalledWith('p1', 'TRF-99');
    expect(avisos.exito).toHaveBeenCalledWith('Pago aprobado.');
  });

  it('si se arrepiente de aprobar, no se manda nada', async () => {
    pagos.pendientes.mockResolvedValue(exito([pago()]));
    dialogo.pregunta.mockResolvedValue(null);

    await monta();
    await userEvent.click(await screen.findByRole('button', { name: 'Aprobar' }));

    expect(pagos.aprueba).not.toHaveBeenCalled();
    expect(avisos.error).not.toHaveBeenCalled();
  });

  /** Rechazar SIEMPRE lleva motivo: es lo que se le acaba contando al afiliado. */
  it('rechazar sin motivo avisa y no llega al servidor', async () => {
    pagos.pendientes.mockResolvedValue(exito([pago()]));
    dialogo.pregunta.mockResolvedValue('');

    await monta();
    await userEvent.click(await screen.findByRole('button', { name: 'Rechazar' }));

    expect(avisos.error).toHaveBeenCalledWith('El motivo es obligatorio para rechazar el pago.');
    expect(pagos.rechaza).not.toHaveBeenCalled();
  });

  it('pagar a un afiliado se confirma antes con el importe delante', async () => {
    dialogo.confirma.mockResolvedValue(false);

    await monta();
    // Se espera al importe ya convertido: es la señal de que las tasas llegaron y de que la pregunta
    // va a llevar la cifra buena.
    await screen.findByText('$20.00');
    await userEvent.click(screen.getByRole('button', { name: 'Pagar aprobado al wallet' }));

    expect(dialogo.confirma).toHaveBeenCalledWith('¿Pagar $20.00 al wallet de este afiliado?');
    expect(pagos.paga).not.toHaveBeenCalled();
  });

  it('al abrir la ficha de un afiliado se piden sus comisiones', async () => {
    puerto.detalle.mockResolvedValue(
      exito({
        afiliado: afiliado(),
        codigos: [{ id: 'c1', codigo: 'ANA10', clics: 4, activo: true }],
        comisiones: [],
      }),
    );

    await monta();
    await userEvent.click(await screen.findByText('Ana Ruiz'));

    expect(await screen.findByText('ANA10')).toBeInTheDocument();
    expect(puerto.detalle).toHaveBeenCalledWith('a1');
  });
});
