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
async function monta(sobrescribe: Partial<PanelPort> = {}) {
  return render(PanelPage, {
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
    await monta();

    // Sin tasas cargadas se escribe en dólares canónicos, que es el dato del backend, y con símbolo:
    // un número suelto en una tarjeta de facturación no dice en qué divisa está.
    await waitFor(() => expect(screen.getAllByText(/12,500|12500/).length).toBeGreaterThan(0));
    expect(screen.getByText(/\$\s?12,500/)).toBeInTheDocument();
  });
});
