import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRouteSnapshot, RouterStateSnapshot, Route } from '@angular/router';
import { describe, expect, it, beforeEach } from 'vitest';
import { RECUPERADOR_DE_SESION } from '@core/auth/recuperador-de-sesion.port';
import { RolDeSesion, SesionActual } from '@core/auth/sesion-actual';
import { TokenStore } from '@core/auth/token-store';
import { USUARIO_ACTUAL_PORT } from '@features/auth/domain/port/autenticacion.port';
import { Usuario } from '@features/auth/domain/model/usuario';
import { QuienMiraStore } from '../application/logistica/state/quien-mira.store';
import { SECCIONES_ADMIN } from '../../../layout/admin/navegacion-admin';
import { MAPA_DEL_PANEL } from '../domain/gestion/model/navegacion';
import { rutas } from './admin.routes';

/**
 * Quién puede ABRIR cada pantalla del panel.
 *
 * <p>El panel tiene dos listas de quién ve qué, escritas por separado: el MENÚ —que marca con
 * `permitidaAOperador` lo que le toca a quien da soporte— y los GUARDIANES de las rutas. El menú estaba
 * bien y las rutas no: abrían con `exigeRol('ADMIN', 'OPERATOR')` bloques enteros —todo el catálogo,
 * toda la logística— que el backend reserva a administración. Su regla es exacta y se lee en
 * `BffSecurityConfig`: solo `/api/admin/orders/**` y `/api/admin/operator/**` admiten OPERATOR; el
 * resto de `/api/admin/**` es ADMIN.
 *
 * <p>Lo que se rompía en producción no es que el operador robase datos —el backend le contesta 403—,
 * sino que le enseñábamos dieciocho pantallas del negocio: precios de coste, proveedores, márgenes,
 * facturación, usuarios. Los rótulos, los filtros y los formularios se pintan ANTES de la primera
 * petición, así que la estructura del negocio se ve entera aunque las tablas salgan vacías.
 *
 * <p>Esta prueba ata las dos listas para que no vuelvan a separarse: se recorre el árbol de rutas de
 * verdad, se ejecuta cada guardián como OPERATOR y se comprueba que lo que se abre es exactamente lo
 * que su menú le ofrece. Añadir una pantalla al panel sin decidir de quién es la deja en rojo.
 */
describe('permisos de las rutas del panel', () => {
  /** Una ruta ya resuelta, con su camino completo y su guardián. */
  interface RutaPlana {
    readonly camino: string;
    readonly guardianes: readonly NonNullable<Route['canActivate']>[number][];
  }

  async function aplana(
    lista: readonly Route[],
    prefijo = '',
    heredados: readonly NonNullable<Route['canActivate']>[number][] = [],
  ): Promise<RutaPlana[]> {
    const planas: RutaPlana[] = [];
    for (const ruta of lista) {
      if (ruta.redirectTo !== undefined) {
        continue;
      }
      // Los DOS: `canMatch` decide si la ruta coincide y `canActivate` si se puede entrar. Mirar solo
      // uno dejaría fuera justo el reparto de `/admin`, que se resuelve por coincidencia.
      const guardianes = [...heredados, ...(ruta.canMatch ?? []), ...(ruta.canActivate ?? [])];
      const camino = [prefijo, ruta.path].filter((t) => t !== undefined && t !== '').join('/');

      if (ruta.loadChildren) {
        const hijas = await (ruta.loadChildren as () => Promise<Route[]>)();
        planas.push(...(await aplana(hijas, camino, guardianes)));
      } else if (ruta.children) {
        planas.push(...(await aplana(ruta.children, camino, guardianes)));
      } else {
        planas.push({ camino, guardianes });
      }
    }
    return planas;
  }

  /** Los destinos que el MENÚ le ofrece a quien da soporte, sin el prefijo del panel. */
  const DEL_OPERADOR = SECCIONES_ADMIN.flatMap((seccion) =>
    seccion.opciones
      .filter((opcion) => opcion.permitidaAOperador)
      .map((opcion) => opcion.destino.replace(/^\/admin\/?/, '')),
  );

  /** Una ruta le toca al operador si es uno de sus destinos o una subpágina suya. */
  const leToca = (camino: string) =>
    DEL_OPERADOR.some((suyo) => camino === suyo || camino.startsWith(`${suyo}/`));

  /**
   * El panel tiene DOS sitios donde consta quién mira: `SesionActual`, del núcleo, y `QuienMiraStore`,
   * del área de logística —que sobrevive porque además de decidir, CARGA el dato que necesita la
   * pantalla de ganancias del operador—. Se rellenan los dos con el mismo papel: si se rellenara solo
   * uno, media prueba mediría una sesión vacía en vez de una negativa.
   */
  async function abre(guardianes: RutaPlana['guardianes'], rol: RolDeSesion): Promise<boolean> {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: RECUPERADOR_DE_SESION, useValue: { asegura: async () => undefined } },
        { provide: TokenStore, useValue: { acceso: () => 'jwt' } },
        { provide: USUARIO_ACTUAL_PORT, useValue: { consulta: async () => ({ ok: false }) } },
      ],
    });
    TestBed.inject(SesionActual).publica({
      id: 'u1',
      rol,
      nombreVisible: 'Quien mira',
      pais: 'ES',
    });
    TestBed.inject(QuienMiraStore).fija({
      id: 'u1',
      email: 'quien@mira.test',
      rol,
      activo: true,
      creadoEl: '2026-01-01T00:00:00Z',
      permisos: [],
    } satisfies Usuario);

    const ruta = {} as ActivatedRouteSnapshot;
    const estado = { url: '/admin' } as RouterStateSnapshot;
    for (const guardian of guardianes) {
      const veredicto = await TestBed.runInInjectionContext(() =>
        (guardian as (r: ActivatedRouteSnapshot, e: RouterStateSnapshot) => unknown)(ruta, estado),
      );
      if (veredicto !== true) {
        return false;
      }
    }
    return true;
  }

  let planas: RutaPlana[];

  beforeEach(async () => {
    planas = await aplana(rutas);
  });

  it('el menú de quien da soporte no está vacío', () => {
    // Si esto se rompe, el resto de la prueba pasaría por vacuidad.
    expect(DEL_OPERADOR).toEqual(expect.arrayContaining(['orders', 'operator/earnings', 'profile']));
  });

  it('quien da soporte no abre ninguna pantalla que su menú no le ofrezca', async () => {
    const coladas: string[] = [];
    for (const ruta of planas) {
      if (!leToca(ruta.camino) && (await abre(ruta.guardianes, 'OPERATOR'))) {
        coladas.push(`/admin/${ruta.camino}`);
      }
    }
    expect(coladas).toEqual([]);
  });

  it('quien da soporte abre todo lo que su menú sí le ofrece', async () => {
    const cerradas: string[] = [];
    for (const ruta of planas) {
      if (leToca(ruta.camino) && !(await abre(ruta.guardianes, 'OPERATOR'))) {
        cerradas.push(`/admin/${ruta.camino}`);
      }
    }
    expect(cerradas).toEqual([]);
  });

  /**
   * La regresión que este arreglo podía causar: al entrar, `destinoPorDefecto` manda a `/admin` tanto a
   * quien administra como a quien da soporte. Cerrar el panel de control sin dejar salida habría
   * devuelto al operador al escaparate en CADA acceso.
   *
   * <p>Se comprueban las dos piezas que producen el desvío en vez de navegar de verdad: montar la
   * navegación completa cargaría las treinta y cinco pantallas del panel, y lo que decide el reparto son
   * exactamente estas dos cosas —que el panel solo COINCIDA para quien administra, y que justo detrás
   * quede el desvío a los pedidos.
   */
  it('quien da soporte entra por /admin y acaba en sus pedidos', async () => {
    const indice = rutas.filter((r) => r.path === '' && r.pathMatch === 'full');

    expect(indice).toHaveLength(2);
    expect(indice[0].canMatch).toBeDefined();
    expect(indice[1].redirectTo).toBe('orders');

    const coincide = indice[0].canMatch![0];
    expect(await abre([coincide], 'ADMIN')).toBe(true);
    expect(await abre([coincide], 'OPERATOR')).toBe(false);
  });

  /**
   * La misma fuga por otra puerta. La paleta rápida (Ctrl/⌘+K) es una SEGUNDA lista de destinos del
   * panel, y no filtraba por papel: a quien da soporte le ofrecía precios, facturación, carteras,
   * usuarios y socios. Aunque ahora todos reboten, seguir ofreciéndolos enseña la estructura del
   * negocio y convierte cada atajo en un desvío al escaparate.
   */
  it('la paleta rápida no le ofrece a quien da soporte nada que no pueda abrir', () => {
    const ofrecidas = MAPA_DEL_PANEL.filter((entrada) => entrada.permitidaAOperador).map(
      (entrada) => entrada.destino,
    );
    const inalcanzables = ofrecidas.filter(
      (destino) => !leToca(destino.replace(/^\/admin\/?/, '')),
    );

    expect(inalcanzables).toEqual([]);
    // Y no puede quedarse vacía: sin ninguna entrada, la paleta no le sirve de nada.
    expect(ofrecidas.length).toBeGreaterThan(0);
  });

  it('quien administra abre el panel entero', async () => {
    const cerradas: string[] = [];
    for (const ruta of planas) {
      if (!(await abre(ruta.guardianes, 'ADMIN'))) {
        cerradas.push(`/admin/${ruta.camino}`);
      }
    }
    expect(cerradas).toEqual([]);
  });

  it('quien es cliente no abre ninguna', async () => {
    const abiertas: string[] = [];
    for (const ruta of planas) {
      if (await abre(ruta.guardianes, 'USER')) {
        abiertas.push(`/admin/${ruta.camino}`);
      }
    }
    expect(abiertas).toEqual([]);
  });
});
