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
