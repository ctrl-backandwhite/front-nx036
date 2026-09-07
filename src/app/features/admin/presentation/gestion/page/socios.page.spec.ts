import { AppError } from '@shared/error/app-error';
import { Result } from '@shared/result/result';
import { DeferBlockBehavior } from '@angular/core/testing';
import { render, screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { SOCIOS_PORT } from '../../../domain/gestion/port/socios.port';
import { ClienteOauth, SecretoEmitido } from '../../../domain/gestion/model/socios';
import {
  BorraElCliente,
  ConsultaSocios,
  CreaElCliente,
  PanoramaDeSocios,
  PruebaLosWebhooks,
  RotaElSecreto,
} from '../../../application/gestion/use-case/socios.use-case';
import { SociosPage } from './socios.page';
import { instalaObservadorDeVisibilidad } from '../pruebas/visibilidad';

/**
 * El DOM simulado de las pruebas NO trae `IntersectionObserver`, que es lo que usa `@defer (on
 * viewport)` para saber cuándo se llega a un bloque. Sin el doble, montar la pantalla revienta con
 * «IntersectionObserver is not defined» y el fallo parece del componente cuando es del entorno.
 */
instalaObservadorDeVisibilidad();

const cliente = (parcial: Partial<ClienteOauth> = {}): ClienteOauth => ({
  id: '1',
  identificador: 'acme-prod',
  nombre: 'Acme Inc.',
  concesiones: 'client_credentials',
  permisos: 'catalog.read orders.write',
  ...parcial,
});

/**
 * Estas pantallas montan tablas enteras y el teclado se simula tecla a tecla: con el resto de equipos
 * compilando a la vez, los cinco segundos por defecto de Vitest se agotan y la prueba falla por el
 * reloj, no por el código. Se les da holgura para que lo que falle sea siempre el comportamiento.
 */
vi.setConfig({ testTimeout: 30_000 });

function enEspanol(): void {
  document.cookie = 'nx036-locale=es';
}

/**
 * `Playthrough` pinta los bloques `@defer` como si ya se hubiera llegado a ellos. Sin esto, lo que va
 * bajo el pliegue se queda en su hueco reservado —en una prueba nadie se desplaza por la página— y las
 * aserciones fallarían con «no se encuentra el elemento».
 */
describe('SociosPage', () => {

  const puerto = {
    clientes: vi.fn(), aplicaciones: vi.fn(), entregas: vi.fn(), crea: vi.fn(),
    rotaSecreto: vi.fn(), borra: vi.fn(), pruebaWebhooks: vi.fn(),
  };
  const dialogo = { confirma: vi.fn(), alerta: vi.fn(), pregunta: vi.fn() };
  const avisos = { exito: vi.fn(), error: vi.fn(), muestra: vi.fn() };

  const monta = () =>
    render(SociosPage, {
    deferBlockBehavior: DeferBlockBehavior.Playthrough,
      providers: [
        { provide: SOCIOS_PORT, useValue: puerto },
        { provide: DialogoStore, useValue: dialogo },
        { provide: AvisosStore, useValue: avisos },
        ConsultaSocios, CreaElCliente, RotaElSecreto, BorraElCliente, PruebaLosWebhooks,
      ],
    });

  beforeEach(() => {
    enEspanol();
    vi.resetAllMocks();
    puerto.clientes.mockResolvedValue(exito([cliente()]));
    puerto.aplicaciones.mockResolvedValue(exito([]));
    puerto.entregas.mockResolvedValue(exito([]));
    dialogo.alerta.mockResolvedValue(true);
  });

  it('enseña cada cliente con su identificador y sus permisos traducidos', async () => {
    await monta();

    expect(await screen.findByText('acme-prod')).toBeInTheDocument();
    expect(screen.getByText('Acme Inc.')).toBeInTheDocument();
    expect(screen.getByText('Servidor a servidor')).toBeInTheDocument();
    expect(screen.getByText('Leer catálogo · Crear/actualizar pedidos')).toBeInTheDocument();
  });

  /** Un nombre que en realidad es un identificador técnico no le dice nada a nadie. */
  it('si el nombre es un identificador se cae al alias, que al menos se reconoce', async () => {
    puerto.clientes.mockResolvedValue(
      exito([cliente({ nombre: '2f1c4a6e-1111-2222-3333-444455556666' })]),
    );

    await monta();

    expect(await screen.findAllByText('acme-prod')).toHaveLength(2);
    expect(screen.queryByText('2f1c4a6e-1111-2222-3333-444455556666')).not.toBeInTheDocument();
  });

  /** El secreto no está: el backend solo lo devuelve al crear y al rotar, así que no hay nada que ver. */
  it('el secreto nunca se enseña en la tabla', async () => {
    await monta();
    await screen.findByText('acme-prod');

    expect(screen.getByText('••••••••')).toBeInTheDocument();
  });

  it('rotar el secreto se pregunta antes, porque invalida el anterior', async () => {
    dialogo.confirma.mockResolvedValue(false);

    await monta();
    await userEvent.click(await screen.findByRole('button', { name: 'Rotar secret' }));

    expect(dialogo.confirma).toHaveBeenCalledWith(
      '¿Generar un nuevo secret para acme-prod? El anterior dejará de funcionar al instante.',
    );
    expect(puerto.rotaSecreto).not.toHaveBeenCalled();
  });

  /** El nuevo secreto es la ÚNICA vez que va a verse: sale en un diálogo que hay que cerrar a mano. */
  it('al rotar, el secreto nuevo se enseña en ese mismo instante', async () => {
    dialogo.confirma.mockResolvedValue(true);
    puerto.rotaSecreto.mockResolvedValue(
      exito({ identificador: 'acme-prod', secreto: 's3cr3t0', mensaje: 'Cópialo ya' }),
    );

    await monta();
    await userEvent.click(await screen.findByRole('button', { name: 'Rotar secret' }));

    expect(dialogo.alerta).toHaveBeenCalledWith(
      expect.stringContaining('s3cr3t0'),
      'Rotar secret',
      'success',
    );
  });

  it('un fallo al rotar se cuenta con el mensaje del servidor', async () => {
    dialogo.confirma.mockResolvedValue(true);
    puerto.rotaSecreto.mockResolvedValue(fallo(creaError('conflicto', 'Cliente bloqueado')));

    await monta();
    await userEvent.click(await screen.findByRole('button', { name: 'Rotar secret' }));

    expect(avisos.error).toHaveBeenCalledWith('Cliente bloqueado');
    expect(dialogo.alerta).not.toHaveBeenCalled();
  });

  it('borrar un cliente se confirma y, si se acepta, se borra', async () => {
    dialogo.confirma.mockResolvedValue(true);
    puerto.borra.mockResolvedValue(exito(undefined));

    await monta();
    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar cliente' }));

    expect(puerto.borra).toHaveBeenCalledWith('acme-prod');
    expect(avisos.exito).toHaveBeenCalledWith('acme-prod eliminado.');
  });

  it('dar de alta un cliente enseña el secreto recién emitido', async () => {
    puerto.crea.mockResolvedValue(exito({ identificador: 'nuevo-1', secreto: 'abc123' }));

    await monta();
    await userEvent.click(await screen.findByRole('button', { name: 'Crear cliente' }));
    await userEvent.type(screen.getByLabelText('Nombre'), 'Acme');
    const botones = screen.getAllByRole('button', { name: 'Crear cliente' });
    await userEvent.click(botones[botones.length - 1]);

    expect(puerto.crea).toHaveBeenCalledWith({
      nombre: 'Acme',
      permisos: ['catalog.read', 'orders.write'],
    });
    expect(dialogo.alerta).toHaveBeenCalledWith(
      expect.stringContaining('abc123'),
      'Crear cliente',
      'success',
    );
  });

  it('sin aplicaciones ni entregas lo dice en vez de dejar las tablas en blanco', async () => {
    await monta();

    expect(
      await screen.findByText('Aún no hay partner apps. Registra una desde la API.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Sin webhooks salientes registrados.')).toBeInTheDocument();
  });

  /**
   * Se comprueba la ESTRUCTURA y no el texto: el rótulo depende de qué diccionario haya llegado a
   * cargarse en la pasada —en el banco de pruebas cae al inglés—, y afirmarlo estaría probando la
   * traducción en vez de la pantalla. Lo que importa aquí es que las tres tablas siguen en pie y
   * vacías, no muertas.
   */
  it('un fallo al leer las tres tablas no tumba la pantalla', async () => {
    puerto.clientes.mockResolvedValue(fallo(creaError('sin-conexion')));
    puerto.aplicaciones.mockResolvedValue(fallo(creaError('sin-conexion')));
    puerto.entregas.mockResolvedValue(fallo(creaError('sin-conexion')));

    const { container } = await monta();

    await waitFor(() => expect(container.querySelectorAll('table')).toHaveLength(3));
    expect(container.querySelector('h1')).toBeInTheDocument();
    // Ninguna fila de datos: las tres tablas quedan con su cabecera y su aviso de vacío.
    expect(container.querySelectorAll('tbody tr').length).toBeLessThanOrEqual(3);
  });

  it('probar los webhooks dispara la prueba y avisa si el servidor la rechaza', async () => {
    puerto.pruebaWebhooks.mockResolvedValue(fallo(creaError('error-del-servidor')));

    await monta();
    await userEvent.click(await screen.findByRole('button', { name: 'Probar webhooks' }));

    expect(puerto.pruebaWebhooks).toHaveBeenCalled();
    expect(avisos.error).toHaveBeenCalledWith('No se pudo enviar el webhook de prueba.');
  });
});

/**
 * Los socios de integración: sus credenciales y sus entregas de webhook.
 *
 * <p>Todo lo delicado de esta pantalla gira alrededor de una idea: **el secreto solo se ve una vez**.
 * De ahí las dos reglas que se fijan aquí:
 *
 * <ul>
 *   <li>rotar PREGUNTA antes, porque invalida el anterior al instante y la integración que lo use deja
 *       de entrar hasta que alguien actualice su configuración;
 *   <li>y el secreto nuevo sale en un diálogo que hay que cerrar A MANO — un aviso que se desvanece
 *       solo se llevaría por delante la única oportunidad de copiarlo.
 * </ul>
 */
const CLIENTE_BASE: ClienteOauth = {
  id: 'c1',
  identificador: 'nx-partner-1',
  nombre: 'Tienda de Ana',
  concesiones: 'client_credentials',
  permisos: 'catalog:read',
};

const SECRETO_EMITIDO: SecretoEmitido = { identificador: 'nx-partner-1', secreto: 's3cr3t' };

interface OpcionesDeSocios {
  panorama?: PanoramaDeSocios;
  rotar?: 'falla';
  borrar?: 'falla';
  probar?: 'falla';
}

async function montaConDobles(opciones: OpcionesDeSocios = {}) {
  const consulta = vi.fn(
    async (): Promise<PanoramaDeSocios> =>
      opciones.panorama ?? {
        clientes: [CLIENTE_BASE],
        aplicaciones: [],
        entregas: [
          { id: 'e1', evento: 'ORDER_CREATED', estado: 'FAILED', intentos: 3, codigoDeRespuesta: 502 },
        ],
      },
  );
  const rota = vi.fn(
    async (_id: string): Promise<Result<SecretoEmitido, AppError>> =>
      opciones.rotar === 'falla'
        ? fallo(creaError('conflicto', 'No se pudo rotar'))
        : exito(SECRETO_EMITIDO),
  );
  const borra = vi.fn(
    async (_id: string): Promise<Result<void, AppError>> =>
      opciones.borrar === 'falla'
        ? fallo(creaError('conflicto', 'Tiene integraciones vivas'))
        : exito(undefined),
  );
  const prueba = vi.fn(
    async (): Promise<Result<number, AppError>> =>
      opciones.probar === 'falla' ? fallo(creaError('error-del-servidor')) : exito(4),
  );

  const vista = await render(SociosPage, {
    deferBlockBehavior: DeferBlockBehavior.Playthrough,
    providers: [
      AvisosStore,
      DialogoStore,
      { provide: ConsultaSocios, useValue: { ejecuta: consulta } },
      { provide: RotaElSecreto, useValue: { ejecuta: rota } },
      { provide: BorraElCliente, useValue: { ejecuta: borra } },
      { provide: PruebaLosWebhooks, useValue: { ejecuta: prueba } },
      { provide: CreaElCliente, useValue: { ejecuta: async () => exito(SECRETO_EMITIDO) } },
    ],
  });
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();

  const asienta = async () => {
    await new Promise((sigue) => setTimeout(sigue, 0));
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
  };

  const pantalla = vista.fixture.componentInstance as unknown as Record<
    string,
    (...args: never[]) => Promise<void> | void
  >;

  return {
    vista,
    asienta,
    pantalla,
    consulta,
    rota,
    borra,
    prueba,
    avisos: vista.fixture.debugElement.injector.get(AvisosStore),
    dialogo: vista.fixture.debugElement.injector.get(DialogoStore),
  };
}

describe('SociosPage · rotación, borrado y prueba de webhooks', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('carga el panorama al entrar', async () => {
    const { consulta } = await montaConDobles();

    expect(consulta).toHaveBeenCalled();
    expect(screen.getByText('nx-partner-1')).toBeInTheDocument();
  });

  /** El secreto nunca se pinta: solo su identificador y un marcador. */
  it('el secreto no se enseña con la lista, solo se puede revelar', async () => {
    const { vista } = await montaConDobles();

    expect((vista.fixture.nativeElement.textContent as string)).not.toContain('s3cr3t');
  });

  describe('rotar el secreto', () => {
    /** Rotar invalida el anterior al instante: quien lo use deja de entrar hasta que se actualice. */
    it('PREGUNTA antes, y si se dice que no no se rota', async () => {
      const { pantalla, rota, dialogo, asienta } = await montaConDobles();

      const enCurso = pantalla['rota']('nx-partner-1' as never);
      await asienta();

      expect(dialogo.actual()?.clase).toBe('confirm');
      expect(dialogo.actual()?.mensaje).toContain('nx-partner-1');
      dialogo.cierra(false);
      await enCurso;
      expect(rota).not.toHaveBeenCalled();
    });

    /** Es la ÚNICA vez que el secreto va a verse: tiene que quedarse hasta que se cierre a mano. */
    it('al confirmar, el secreto nuevo sale en un diálogo que hay que cerrar', async () => {
      const { pantalla, rota, dialogo, asienta } = await montaConDobles();

      const enCurso = pantalla['rota']('nx-partner-1' as never);
      await asienta();
      dialogo.cierra(true);
      await asienta();

      expect(rota).toHaveBeenCalledWith('nx-partner-1');
      expect(dialogo.actual()?.clase).toBe('alert');
      expect(dialogo.actual()?.mensaje).toContain('s3cr3t');

      dialogo.cierra(true);
      await enCurso;
    });

    it('si el servidor lo rechaza, se dice y no se enseña ningún secreto', async () => {
      const { pantalla, avisos, dialogo, asienta } = await montaConDobles({ rotar: 'falla' });

      const enCurso = pantalla['rota']('nx-partner-1' as never);
      await asienta();
      dialogo.cierra(true);
      await enCurso;
      await asienta();

      expect(avisos.avisos().at(-1)).toMatchObject({ tipo: 'error', mensaje: 'No se pudo rotar' });
      expect(dialogo.actual()).toBeNull();
    });
  });

  describe('borrar un cliente', () => {
    it('PREGUNTA con el identificador delante', async () => {
      const { pantalla, borra, dialogo, asienta } = await montaConDobles();

      const enCurso = pantalla['borra']('nx-partner-1' as never);
      await asienta();

      expect(dialogo.actual()?.mensaje).toContain('nx-partner-1');
      dialogo.cierra(false);
      await enCurso;
      expect(borra).not.toHaveBeenCalled();
    });

    it('y al confirmar borra y vuelve a leer', async () => {
      const { pantalla, borra, consulta, dialogo, asienta } = await montaConDobles();
      consulta.mockClear();

      const enCurso = pantalla['borra']('nx-partner-1' as never);
      await asienta();
      dialogo.cierra(true);
      await enCurso;
      await asienta();

      expect(borra).toHaveBeenCalledWith('nx-partner-1');
      expect(consulta).toHaveBeenCalled();
    });

    it('si el servidor se niega, se enseña SU motivo', async () => {
      const { pantalla, avisos, dialogo, asienta } = await montaConDobles({ borrar: 'falla' });

      const enCurso = pantalla['borra']('nx-partner-1' as never);
      await asienta();
      dialogo.cierra(true);
      await enCurso;

      expect(avisos.avisos().at(-1)?.mensaje).toBe('Tiene integraciones vivas');
    });
  });

  describe('probar los webhooks', () => {
    /**
     * Entre disparar la prueba y releer la tabla se espera al drenaje de la cola: releer al instante
     * enseñaría la tabla igual que antes y parecería que la prueba no salió.
     */
    it('espera al drenaje antes de releer, y dice a cuántos se disparó', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        const { pantalla, prueba, consulta, avisos } = await montaConDobles();
        consulta.mockClear();

        const enCurso = pantalla['pruebaWebhooks']();
        await vi.advanceTimersByTimeAsync(2000);
        await enCurso;

        expect(prueba).toHaveBeenCalled();
        expect(consulta).toHaveBeenCalled();
        expect(avisos.avisos().at(-1)?.mensaje).toContain('4');
      } finally {
        vi.useRealTimers();
      }
    });

    it('si falla, se dice y el botón se suelta sin esperar al drenaje', async () => {
      const { pantalla, consulta, avisos, asienta } = await montaConDobles({ probar: 'falla' });
      consulta.mockClear();

      await pantalla['pruebaWebhooks']();
      await asienta();

      expect(avisos.avisos().at(-1)?.tipo).toBe('error');
      /* No hay nada que drenar: releer la tabla sería esperar segundo y medio para nada. */
      expect(consulta).not.toHaveBeenCalled();
    });
  });

  it('el alta cierra el formulario y vuelve a leer', async () => {
    const { pantalla, consulta, asienta } = await montaConDobles();
    consulta.mockClear();

    pantalla['altaHecha']();
    await asienta();

    expect(consulta).toHaveBeenCalled();
  });
});
