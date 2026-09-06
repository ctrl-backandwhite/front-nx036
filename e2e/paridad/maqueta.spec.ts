import { Page, expect, test } from '@playwright/test';
import { ANGULAR, REACT, abre, bajaAlFondo } from '../util/comparador';

/**
 * Paridad de MAQUETA: que las piezas sean las mismas y ocupen lo mismo.
 *
 * <p>Esta batería existe porque la de paridad cosmética dejó pasar defectos que se veían a simple
 * vista. Aquella compara colores, tipografías y radios ya resueltos, y con eso no caza nada de esto:
 *
 * <ul>
 *   <li>Los filtros del catálogo: el front anterior usa botones con forma de píldora que abren un panel
 *       propio; el porte usaba desplegables nativos con la etiqueta al lado. Mismos colores, misma
 *       tipografía, y una pantalla completamente distinta.
 *   <li>El panel lateral del acceso: cubría media pantalla en vez de toda, porque el elemento anfitrión
 *       del componente se interponía entre la rejilla y la celda. Los colores eran idénticos.
 *   <li>El mosaico de la portada: se quedaba dentro de la columna de texto en vez de ocupar el ancho.
 * </ul>
 *
 * <p>Lo que se compara aquí es lo que aquella no miraba: CUÁNTAS piezas de cada tipo hay, y CUÁNTO
 * ocupan las grandes. Es lo que distingue «se ve igual» de «tiene los mismos colores».
 */

/** Piezas cuyo NÚMERO no debería cambiar entre las dos aplicaciones. */
async function inventario(page: Page): Promise<Record<string, number>> {
  return page.evaluate(() => {
    const cuenta = (selector: string) =>
      Array.from(document.querySelectorAll(selector)).filter((e) => {
        const c = e.getBoundingClientRect();
        return c.width > 0 && c.height > 0;
      }).length;
    return {
      'campos de texto': cuenta('input[type="text"], input[type="search"], input:not([type])'),
      'campos numéricos': cuenta('input[type="number"]'),
      'desplegables nativos': cuenta('select'),
      casillas: cuenta('input[type="checkbox"], input[type="radio"]'),
      botones: cuenta('button'),
      enlaces: cuenta('a[href]'),
      imágenes: cuenta('img'),
      titulares: cuenta('h1, h2, h3'),
      tablas: cuenta('table'),
    };
  });
}

/**
 * El ancho de los contenedores grandes, en franjas.
 *
 * <p>Se comparan por franja y no al píxel porque el marcado no es idéntico y una diferencia de dos
 * píxeles no la ve nadie. Lo que sí se ve —y es lo que esto caza— es un bloque que ocupa media
 * pantalla donde debería ocupar toda, o al revés.
 */
async function franjas(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const ancho = document.documentElement.clientWidth;
    const franja = (v: number) => {
      const parte = v / ancho;
      if (parte > 0.95) return 'todo';
      if (parte > 0.7) return 'casi todo';
      if (parte > 0.45) return 'medio';
      if (parte > 0.2) return 'un cuarto';
      return 'poco';
    };
    return Array.from(document.querySelectorAll('main, header, footer, aside, section, article'))
      .filter((e) => {
        const c = e.getBoundingClientRect();
        return c.width > 0 && c.height > 40;
      })
      .slice(0, 25)
      .map((e) => `${e.tagName.toLowerCase()}:${franja(e.getBoundingClientRect().width)}`)
      .sort();
  });
}

const PANTALLAS = ['/', '/about', '/pricing', '/contact', '/login', '/register', '/status', '/developers'];

test.describe('paridad de maqueta', () => {
  for (const ruta of PANTALLAS) {
    test(`${ruta} tiene las mismas piezas`, async ({ page }) => {
      await abre(page, `${REACT}${ruta}`);
      await bajaAlFondo(page);
      const enReact = await inventario(page);

      await abre(page, `${ANGULAR}${ruta}`);
      await bajaAlFondo(page);
      const enAngular = await inventario(page);

      /* Se admite una diferencia pequeña en las piezas que dependen de los datos —una fila más de
       * catálogo, un enlace más en una lista— pero NO en los controles de formulario: ahí un
       * desplegable nativo de más significa que se ha portado con otro componente, que es justo lo
       * que hay que cazar. */
      const exactas = ['desplegables nativos', 'campos numéricos', 'casillas', 'tablas'];
      for (const pieza of exactas) {
        expect(
          enAngular[pieza],
          `${ruta}: hay ${enAngular[pieza]} «${pieza}» y el front anterior tiene ${enReact[pieza]}`,
        ).toBe(enReact[pieza]);
      }

      const tolerantes = ['campos de texto', 'botones', 'titulares'];
      for (const pieza of tolerantes) {
        const diferencia = Math.abs(enAngular[pieza] - enReact[pieza]);
        expect(
          diferencia,
          `${ruta}: ${enAngular[pieza]} «${pieza}» frente a ${enReact[pieza]} del front anterior`,
        ).toBeLessThanOrEqual(2);
      }
    });
  }

  for (const ruta of PANTALLAS) {
    test(`${ruta} reparte el espacio igual`, async ({ page }) => {
      await abre(page, `${REACT}${ruta}`);
      const enReact = await franjas(page);

      await abre(page, `${ANGULAR}${ruta}`);
      const enAngular = await franjas(page);

      /* Se comparan los CONJUNTOS de franjas, no la lista ordenada: el orden del marcado no coincide
       * entre las dos tecnologías y compararlo daría diferencias en cada pantalla. Lo que importa es
       * que no aparezca un bloque «medio» donde el original tiene uno «todo». */
      const resume = (lista: string[]) => {
        const cuenta: Record<string, number> = {};
        for (const x of lista) {
          cuenta[x] = (cuenta[x] ?? 0) + 1;
        }
        return cuenta;
      };
      const a = resume(enReact);
      const b = resume(enAngular);

      for (const clave of Object.keys(b)) {
        if (!clave.includes(':medio') && !clave.includes(':un cuarto')) {
          continue;
        }
        expect(
          a[clave] ?? 0,
          `${ruta}: el porte tiene ${b[clave]} «${clave}» y el front anterior ${a[clave] ?? 0}`,
        ).toBeGreaterThan(0);
      }
    });
  }
});
