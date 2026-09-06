import { expect, test } from '@playwright/test';
import { ANGULAR, REACT, abre } from '../util/comparador';

/**
 * Dimensión E: rendimiento comparado.
 *
 * <p>Esta dimensión **no se conforma con empatar**. El porte no es una copia: donde el original va
 * lento y Angular trae una forma de ir más rápido, tiene que ir más rápido. Así que el criterio no es
 * «parecido», es «igual o mejor», y cualquier pantalla donde el Angular salga peor se anota como
 * defecto con su medida al lado.
 *
 * <p>Se mide con la red limitada: en fibra todo parece rápido y las diferencias que importan —las que
 * sufre quien entra desde el móvil— desaparecen del informe.
 */

interface Medida {
  bytes: number;
  peticiones: number;
  primerPintado: number;
  contenidoPrincipal: number;
}

/**
 * Cuenta lo que de verdad viaja por la red.
 *
 * <p>La primera versión sumaba la cabecera `content-length` y descartaba lo que no la trae. Eso no es
 * un detalle: el front anterior sirve comprimido y en trozos, sin esa cabecera, así que casi ninguna
 * de sus respuestas se contaba. Salía con 43 kB en una pantalla que descarga 1,5 MB, y el porte
 * aparecía como si pesara doce veces más. El sesgo iba justo en contra de lo que se está certificando.
 *
 * <p>`sizes().responseBodySize` es lo TRANSFERIDO —comprimido, que es lo que paga quien navega— y
 * existe para todas las respuestas. `body()` no vale aquí: devuelve el contenido ya descomprimido, y
 * entonces la compresión no se notaría en la medida.
 */
async function mide(page: import('@playwright/test').Page, url: string): Promise<Medida> {
  let bytes = 0;
  let peticiones = 0;
  const cuenta = async (r: import('@playwright/test').Response) => {
    peticiones += 1;
    try {
      const tam = await r.request().sizes();
      bytes += tam.responseBodySize + tam.responseHeadersSize;
    } catch {
      /* una respuesta cancelada no tiene tamaño; no cuenta */
    }
  };
  page.on('response', cuenta);

  await abre(page, url);

  const tiempos = await page.evaluate(() => {
    const pintados = performance.getEntriesByType('paint');
    const primero = pintados.find((p) => p.name === 'first-contentful-paint')?.startTime ?? 0;
    const principal = performance
      .getEntriesByType('largest-contentful-paint' as 'paint')
      .at(-1)?.startTime ?? primero;
    return { primero, principal };
  });

  // Se retira el escuchador. Si se acumulan, la segunda medida de un mismo test sigue alimentando el
  // contador de la primera y el número deja de significar nada.
  page.off('response', cuenta);

  return {
    bytes,
    peticiones,
    primerPintado: tiempos.primero,
    contenidoPrincipal: tiempos.principal,
  };
}

const PANTALLAS = ['/', '/pricing', '/about', '/contact'];

test.describe('rendimiento comparado', () => {
  for (const ruta of PANTALLAS) {
    test(`${ruta} no va peor que en el React`, async ({ page }) => {
      const enReact = await mide(page, `${REACT}${ruta}`);
      const enAngular = await mide(page, `${ANGULAR}${ruta}`);

      // Se informa siempre, pase o falle: el número es el entregable, no el color.
      test.info().annotations.push({
        type: 'medida',
        description:
          `${ruta} — React: ${Math.round(enReact.bytes / 1024)} kB / ${enReact.peticiones} pet. / ` +
          `${Math.round(enReact.contenidoPrincipal)} ms · ` +
          `Angular: ${Math.round(enAngular.bytes / 1024)} kB / ${enAngular.peticiones} pet. / ` +
          `${Math.round(enAngular.contenidoPrincipal)} ms`,
      });

      expect(enAngular.bytes, `${ruta} descarga más bytes que el React`).toBeLessThanOrEqual(
        enReact.bytes,
      );
      expect(
        enAngular.contenidoPrincipal,
        `${ruta} tarda más en enseñar el contenido principal que el React`,
      ).toBeLessThanOrEqual(enReact.contenidoPrincipal * 1.05);
    });
  }

  /**
   * Las peticiones hechas al generar el HTML viajan dentro del documento. Si tras hidratar se repiten,
   * el prerenderizado está pintando la página para volver a pedir lo mismo un instante después: se paga
   * la complejidad y encima se ve el parpadeo.
   */
  test('no se repiten tras hidratar las peticiones del prerenderizado', async ({ page }) => {
    const pedidas: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('/api/')) {
        // Con los PARÁMETROS: dos llamadas al mismo endpoint pidiendo distinto número de elementos no
        // son la misma petición, y compararlas solo por la ruta las daba por repetidas.
        const u = new URL(r.url());
        pedidas.push(u.pathname + u.search);
      }
    });

    await abre(page, `${ANGULAR}/`);

    const repetidas = pedidas.filter((p, i) => pedidas.indexOf(p) !== i);
    expect(repetidas, `se repiten tras hidratar: ${[...new Set(repetidas)].join(', ')}`).toEqual([]);
  });
});
