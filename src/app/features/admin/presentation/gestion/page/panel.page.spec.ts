import { DeferBlockBehavior } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen, waitFor } from '@testing-library/angular';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { SesionActual } from '@core/auth/sesion-actual';
import { PANEL_PORT, PanelPort } from '../../../domain/gestion/port/panel.port';
import { TIPOS_DE_CAMBIO_PORT } from '../../../domain/gestion/port/tipos-de-cambio.port';
import {
  ConsultaMetricas, ConsultaPedidosRecientes, ConsultaSeries,
} from '../../../application/gestion/use-case/panel.use-case';
import { ImportesStore } from '../../../application/gestion/state/importes.store';
import { PanelPage } from './panel.page';
import { instalaObservadorDeVisibilidad } from '../pruebas/visibilidad';

/**
 * El DOM simulado de las pruebas NO trae `IntersectionObserver`, que es lo que usa `@defer (on
 * viewport)` para saber cuándo se llega a un bloque. Sin el doble, montar la pantalla revienta con
 * «IntersectionObserver is not defined» y el fallo parece del componente cuando es del entorno.
 */
instalaObservadorDeVisibilidad();

/**
 * Las pruebas que MONTAN un componente tardan más de lo que Vitest espera por defecto (5 s) cuando hay
 * varios equipos compilando a la vez: el arranque de Angular compite por la máquina. El plazo se sube
 * aquí para que un fallo signifique lo que tiene que significar —que la lógica está mal— y no que el
 * ordenador iba cargado.
 */
vi.setConfig({ testTimeout: 30_000 });

/**
 * Las cifras de cabecera las pinta un contador que ANIMA salvo que el sistema pida movimiento
 * reducido, y el DOM simulado responde que no lo pide: cada cifra tarda 900 ms en llegar a su valor y
 * la comprobación dependía de ganarle la carrera al reloj —con la máquina cargada, la perdía—.
 *
 * <p>Aquí se finge que el sistema SÍ pide movimiento reducido: las cifras se ponen de una vez. Lo que
 * esta pantalla tiene que demostrar es QUÉ cifras enseña, no cuánto tarda en contarlas; la animación
 * tiene su propia prueba en el sistema de diseño (`movimiento.spec.ts`).
 */
let restauraMedios: () => void;

beforeEach(() => {
  const previo = Object.getOwnPropertyDescriptor(window, 'matchMedia');
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (consulta: string) => ({ matches: true, media: consulta }) as MediaQueryList,
  });
  restauraMedios = () => {
    if (previo) {
      Object.defineProperty(window, 'matchMedia', previo);
    } else {
      Reflect.deleteProperty(window, 'matchMedia');
    }
  };
});

afterEach(() => restauraMedios());

const METRICAS = {
  activeProducts: 80, totalProducts: 100, draftProducts: 20, totalOrders: 12, totalUsers: 340,
  totalSuppliers: 7, activePlans: 3, totalSubscriptions: 45, gmvUsd: 12500, mrrUsd: 900,
};

function puerto(sobrescribe: Partial<PanelPort> = {}): PanelPort {
  return {
    metricas: async () =>
      exito({
        productosActivos: METRICAS.activeProducts,
        productosTotales: METRICAS.totalProducts,
        productosBorrador: METRICAS.draftProducts,
        pedidos: METRICAS.totalOrders,
        usuarios: METRICAS.totalUsers,
        proveedores: METRICAS.totalSuppliers,
        planesActivos: METRICAS.activePlans,
        suscripciones: METRICAS.totalSubscriptions,
        gmvUsd: METRICAS.gmvUsd,
        mrrUsd: METRICAS.mrrUsd,
      }),
    pedidosRecientes: async () =>
      exito([
        {
          id: 'o1', numero: 'NX-1024', estado: 'DELIVERED', totalCentimos: 4599,
          divisa: 'USD', realizadoEl: '2026-03-05T10:00:00Z',
        },
      ]),
    series: async () => exito({ pedidosPorDia: {}, gmvCentimosPorDia: {} }),
    ...sobrescribe,
  };
}

/**
 * Monta la pantalla con la sesión YA resuelta.
 *
 * <p>Se publica ANTES de montar, no después: el guardián resuelve quién mira antes de activar la ruta,
 * así que es el estado real al entrar. Publicarla después probaba un caso que en la aplicación no
 * ocurre y dejaba la pantalla sin pedir nada.
 *
 * <p>`Playthrough` hace que los bloques `@defer` se pinten como si ya se hubiera llegado a ellos. Sin
 * eso, lo que va bajo el pliegue —las gráficas y los últimos pedidos— se queda en su hueco reservado,
 * porque en las pruebas nadie se desplaza por la página.
 */
/**
 * Monta y ESPERA a que la pantalla se asiente: las cifras se pintan en dos tiempos —primero las
 * métricas y después su formato con divisa, que llega por una consulta aparte—, y sin esta espera la
 * comprobación miraba la pantalla a medio pintar cuando la máquina iba cargada.
 */
async function monta(sobrescribe: Partial<PanelPort> = {}) {
  const vista = await render(PanelPage, {
    deferBlockBehavior: DeferBlockBehavior.Playthrough,
    providers: [
      provideRouter([]),
      { provide: PANEL_PORT, useValue: puerto(sobrescribe) },
      { provide: TIPOS_DE_CAMBIO_PORT, useValue: { vigentes: async () => exito([]) } },
      {
        provide: SesionActual,
        useFactory: () => {
          const sesion = new SesionActual();
          sesion.publica({ id: 'u1', rol: 'ADMIN', nombreVisible: 'Ana', pais: 'ES' });
          return sesion;
        },
      },
      ConsultaMetricas, ConsultaPedidosRecientes, ConsultaSeries, ImportesStore,
    ],
  });
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();
  return vista;
}

describe('PanelPage', () => {

  /**
   * Se comprueban las CIFRAS y no los rótulos: el rótulo depende de qué diccionario haya llegado a
   * cargarse en la pasada —en el banco de pruebas cae al inglés—, y una aserción sobre él estaría
   * probando la traducción, no la pantalla.
   */
  it('enseña las cifras de cabecera', async () => {
    const { container } = await monta();

    await waitFor(() => expect(screen.getByText(/340/)).toBeInTheDocument());
    // Seis indicadores: productos, activos, pedidos, proveedores, usuarios y planes.
    expect(container.querySelectorAll('nx-bloque-kpi')).toHaveLength(6);
    expect(screen.getByText(/100/)).toBeInTheDocument();
  });

  /**
   * Lo que va bajo el pliegue está en `@defer (on viewport)`: al entrar se pintan las cifras de
   * cabecera y nada más. Aquí se monta SIN `Playthrough` —el comportamiento por defecto deja los
   * bloques diferidos sin disparar— para comprobar que de verdad no llegan hasta que se baja. Sin esta
   * prueba, quitar el diferido no rompería nada y la mejora se perdería en el siguiente cambio.
   */
  it('al entrar no descarga las gráficas ni los últimos pedidos: van bajo el pliegue', async () => {
    const { container } = await render(PanelPage, {
      providers: [
        provideRouter([]),
        { provide: PANEL_PORT, useValue: puerto() },
        { provide: TIPOS_DE_CAMBIO_PORT, useValue: { vigentes: async () => exito([]) } },
        {
          provide: SesionActual,
          useFactory: () => {
            const sesion = new SesionActual();
            sesion.publica({ id: 'u1', rol: 'ADMIN', nombreVisible: 'Ana', pais: 'ES' });
            return sesion;
          },
        },
        ConsultaMetricas, ConsultaPedidosRecientes, ConsultaSeries, ImportesStore,
      ],
    });

    // Las cifras de cabecera SÍ están: son lo que se mira al entrar.
    await waitFor(() => expect(screen.getByText(/340/)).toBeInTheDocument());
    // Lo diferido, no: ni la tabla de pedidos ni las gráficas se han montado.
    expect(container.querySelector('table')).toBeNull();
    expect(container.querySelector('nx-graficas-del-panel')).toBeNull();
  });

  it('enseña los últimos pedidos con su estado y su enlace', async () => {
    await monta();

    const enlace = await screen.findByRole('link', { name: 'NX-1024' });
    expect(enlace).toHaveAttribute('href', '/admin/orders?focus=o1');
    expect(screen.getByText(/delivered|entregado/i)).toBeInTheDocument();
  });

  /** Sin pedidos hay que ofrecer a dónde ir, no dejar una tabla muda. */
  it('sin pedidos ofrece el camino al listado', async () => {
    await monta({ pedidosRecientes: async () => exito([]) });

    // El enlace al listado es lo que importa: sin pedidos hay que ofrecer a dónde ir.
    const enlaces = await screen.findAllByRole('link');
    expect(enlaces.some((e) => e.getAttribute('href') === '/admin/orders')).toBe(true);
  });

  /**
   * El camino de error: si las métricas fallan, la pantalla NO se queda girando para siempre. Se
   * pintan las tarjetas vacías, que es honesto, y el resto del panel sigue funcionando.
   */
  it('con las métricas caídas deja de cargar y sigue en pie', async () => {
    const { container } = await monta({ metricas: async () => fallo(creaError('error-del-servidor')) });

    await waitFor(() => expect(container.querySelector('.loading')).toBeNull());
    expect(container.querySelector('h1')).toBeInTheDocument();
  });

  it('la facturación se escribe formateada, no como número suelto', async () => {
    const vista = await monta();

    // Sin tasas cargadas se escribe en dólares canónicos, que es el dato del backend, y con símbolo:
    // un número suelto en una tarjeta de facturación no dice en qué divisa está.
    /* La espera va sobre el texto YA formateado, no sobre el número a secas.
     *
     * Esperar primero a «12500» y comprobar después el símbolo dejaba una rendija: la cifra se pinta en
     * cuanto llegan las métricas y el formato entra un instante más tarde, con la divisa. Con la máquina
     * cargada, la espera se daba por satisfecha en esa rendija y la comprobación siguiente —síncrona—
     * miraba la pantalla a medio pintar. De ahí que esta prueba fallara una pasada de cada tantas y
     * pasara siempre en solitario. */
    /* Se REPINTA entre intento e intento. `waitFor` a secas solo vuelve a mirar el DOM, y en una
     * aplicación sin zonas nadie repinta por él: si el formato con divisa aterriza después del primer
     * vistazo, la espera se agota mirando un DOM que ya no iba a cambiar. Es lo que hacía fallar esta
     * prueba solo en la pasada completa. */
    await waitFor(
      () => {
        vista.fixture.detectChanges();
        /* Se busca la cifra AGRUPADA junto a un símbolo de moneda, sin exigir una colocación concreta:
         * lo que se certifica es que el importe va formateado y con divisa, no en qué orden los pone el
         * idioma de la pasada —que en el banco de pruebas no siempre es el mismo—. */
        const conImporte = screen.getAllByText((_texto, elemento) => {
          const contenido = elemento?.textContent ?? '';
          return /12[.,]500/.test(contenido) && /[$€]|USD/.test(contenido);
        });
        expect(conImporte.length).toBeGreaterThan(0);
      },
      // El plazo va EXPLÍCITO. La cifra llega en dos saltos —métricas primero, formato con divisa
      // después— y con la suite entera corriendo a la vez el segundo se pasa del segundo por defecto:
      // medido, la espera se rendía a los ~1.100 ms y la prueba pasaba siempre en solitario.
      { timeout: 15_000 },
    );
  });
});
