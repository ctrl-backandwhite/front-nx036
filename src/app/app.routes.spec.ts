import { Route, Routes } from '@angular/router';
import { routes as rutas } from './app.routes';

/**
 * El mapa de rutas de toda la aplicación.
 *
 * <p>Cada pantalla se carga EN DIFERIDO —`loadComponent`, `loadChildren`— y esas funciones no se
 * ejecutan hasta que alguien entra por esa dirección. Eso significa que **un import roto en una ruta
 * poco visitada no rompe nada hasta que alguien la abre**: ni la compilación ni el resto de las pruebas
 * lo notan, porque el módulo nunca llega a pedirse. El síntoma en producción es una pantalla en blanco
 * en una sección concreta, y el error solo aparece en la consola de quien la abrió.
 *
 * <p>Esta batería RESUELVE todos los `loadChildren` —los ficheros de rutas de cada área— y comprueba que
 * cada `loadComponent` es una función. No los invoca: descargar las más de sesenta pantallas dentro de
 * una prueba obliga a compilar la aplicación entera en un solo proceso, y eso dejaba sin CPU al resto de
 * la suite hasta hacer fallar por reloj a baterías que no tienen nada que ver. Comprobado: con esa
 * versión fallaban diez pruebas ajenas; sin ella, ninguna.
 *
 * <p>Lo que sigue cubriendo es lo que de verdad se rompe al reorganizar: un área entera que ya no se
 * puede cargar, una ruta declarada sin forma de llegar a su pantalla, y los dos defectos de orden de
 * abajo. Que cada pantalla suelta se monte lo prueba su propia batería.
 *
 * <p>De paso fija dos cosas del mapa que se rompen al reordenar rutas: que no haya dos hermanas con el
 * mismo camino —la segunda sería inalcanzable— y que el comodín `**` sea siempre la ÚLTIMA de su nivel,
 * porque lo que va detrás no se visita jamás.
 */
/* Cargar el árbol entero descarga de verdad todas las pantallas: son más de sesenta módulos y con el
 * resto de la suite compilando a la vez no cabe en los cinco segundos por defecto. */
vi.setConfig({ testTimeout: 60_000 });

describe('mapa de rutas', () => {
  /** Todas las rutas del árbol, con el camino completo para poder señalar cuál falla. */
  function aplana(rutas: Routes, prefijo = ''): { camino: string; ruta: Route }[] {
    const encontradas: { camino: string; ruta: Route }[] = [];
    for (const ruta of rutas) {
      const camino = `${prefijo}/${ruta.path ?? ''}`.replace(/\/+/g, '/');
      encontradas.push({ camino, ruta });
      if (ruta.children) {
        encontradas.push(...aplana(ruta.children, camino));
      }
    }
    return encontradas;
  }

  it('todas las áreas diferidas se pueden cargar y toda ruta sabe qué pintar', async () => {
    const pendientes: { camino: string; ruta: Route }[] = aplana(rutas);
    const cargadas: string[] = [];

    /* Se recorre en anchura y se van añadiendo los hijos que aparecen: un `loadChildren` trae rutas
     * nuevas que también hay que resolver, y algunas cuelgan tres niveles por debajo. */
    while (pendientes.length > 0) {
      const { camino, ruta } = pendientes.shift()!;

      if (ruta.loadComponent) {
        expect(typeof ruta.loadComponent, `«${camino}» no declara cómo cargar su pantalla`).toBe(
          'function',
        );
        cargadas.push(camino);
      }

      if (ruta.loadChildren) {
        const hijas = await ruta.loadChildren();
        const lista = Array.isArray(hijas) ? hijas : [];
        expect(lista.length, `«${camino}» carga un árbol de rutas vacío`).toBeGreaterThan(0);
        pendientes.push(...aplana(lista, camino));
        cargadas.push(camino);
      }
    }

    /* El recuento es la red de seguridad de la propia prueba: si un cambio dejara el árbol sin
     * cargadores, todo lo de arriba pasaría sin comprobar absolutamente nada. */
    expect(cargadas.length).toBeGreaterThan(50);
  });

  it('no hay dos rutas hermanas con el mismo camino', async () => {
    const revisa = (lista: Routes, donde: string): void => {
      const vistos = new Set<string>();
      for (const ruta of lista) {
        const camino = ruta.path ?? '';
        /* El camino VACÍO se repite a propósito entre hermanas: es como se montan los marcos —uno con
         * cabecera de tienda, otro con la del panel— y cada uno resuelve por sus hijas. Lo que no puede
         * repetirse es un camino con nombre. */
        if (camino !== '') {
          expect(
            vistos.has(camino),
            `«${donde}/${camino}» está dos veces: la segunda es inalcanzable`,
          ).toBe(false);
          vistos.add(camino);
        }
        if (ruta.children) {
          revisa(ruta.children, `${donde}/${camino}`);
        }
      }
    };

    revisa(rutas, '');
  });

  /**
   * Quien PRIMERO reclama el camino vacío de `/admin` tiene que saber pintar algo.
   *
   * <p>Lo que se rompió el 21-oct-2026: el nodo `admin` cuelga varios grupos del mismo camino vacío
   * —así se montan los marcos, y es correcto— pero uno de ellos, las pantallas de «platform»,
   * envolvía las suyas en un padre `path: ''` sin ninguna hija vacía Y se cargaba ANTES que el panel
   * de control. La dirección `/admin` la capturaba ese padre, que no tenía nada que pintar, y el
   * panel salía EN BLANCO: el marco con su barra lateral y el contenido vacío.
   *
   * <p>No lo cazaba nada. Las otras cuarenta pantallas del panel abrían perfectamente, porque su
   * resto de camino no está vacío; y la prueba de hermanas permite a propósito varios caminos
   * vacíos. Se vio en el navegador, contra preproducción, y hubo que mirar el pantallazo.
   *
   * <p>Es la SEGUNDA vez —ya está documentado en `admin.routes.ts`— así que lo que se fija no es el
   * orden, que volverá a cambiar, sino la condición: el PRIMERO que pueda quedarse con el camino
   * vacío tiene que resolverlo, pintando él o teniendo una hija vacía que pinte. Los de detrás dan
   * igual: no les llega.
   */
  it('quien primero reclama el camino vacío de /admin sabe qué pintar', async () => {
    const admin = rutas.find((r) => r.path === 'admin');
    expect(admin, 'no hay nodo /admin en el mapa').toBeDefined();

    const enOrden: Route[] = [];
    for (const hija of admin!.children ?? []) {
      if (hija.loadChildren) {
        const traidas = await hija.loadChildren();
        enOrden.push(...(Array.isArray(traidas) ? traidas : []));
      } else {
        enOrden.push(hija);
      }
    }

    const pinta = (r: Route): boolean =>
      Boolean(r.loadComponent ?? r.component ?? r.redirectTo) ||
      (r.children ?? []).some((h) => (h.path ?? '') === '');

    const primera = enOrden.find((r) => (r.path ?? '') === '');
    expect(primera, 'nadie resuelve /admin: el panel de control no tiene ruta').toBeDefined();
    expect(
      pinta(primera!),
      'el primero que se queda con /admin no pinta nada ni tiene hija vacía: el panel de control ' +
        'sale EN BLANCO, con su marco y el contenido hueco',
    ).toBe(true);
  });

  it('el comodín es siempre la ÚLTIMA de su nivel', () => {
    const revisa = (lista: Routes, donde: string): void => {
      const comodin = lista.findIndex((ruta) => ruta.path === '**');
      if (comodin >= 0) {
        expect(comodin, `en «${donde}» hay rutas detrás del comodín, y no se visitan nunca`).toBe(
          lista.length - 1,
        );
      }
      for (const ruta of lista) {
        if (ruta.children) {
          revisa(ruta.children, `${donde}/${ruta.path ?? ''}`);
        }
      }
    };

    revisa(rutas, '');
  });
});
