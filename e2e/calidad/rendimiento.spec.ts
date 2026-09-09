import { expect, test } from '@playwright/test';
import { ANGULAR, abre } from '../util/comparador';

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

/**
 * Presupuesto de descarga y de tiempo hasta ver el contenido.
 *
 * <p>Antes el listón era el front anterior —«no vayas peor que él»—. Retirado aquél (9-sep-2026), un
 * listón relativo a algo que no existe no es un listón, así que se fija en ABSOLUTO. Los números
 * salen de lo que la aplicación mide hoy, redondeados hacia arriba con holgura: no son un objetivo
 * de mejora, son un techo que avisa si algo se dispara. Bajarlos es trabajo; subirlos, una decisión
 * que hay que justificar aquí mismo.
 */
const PRESUPUESTO: Readonly<Record<string, { kilobytes: number; contenidoPrincipalMs: number }>> = {
  /*
   * LA PORTADA ES UN CASO APARTE, y el número está aquí para que no se pueda ignorar: descarga
   * 11,8 MB en móvil y 17,6 MB en escritorio, entre 79 y 120 peticiones, cuando el resto de
   * pantallas públicas se mueven entre 483 y 601 kB. Son veinte veces más. El grueso son las fotos
   * de los carruseles de producto, que se piden todas aunque solo se vean tres.
   *
   * El techo se fija en 20 MB —lo medido con holgura— para que la certificación avise si empeora,
   * NO porque 20 MB sea aceptable. Bajar esto es trabajo pendiente declarado, no una meta difusa.
   */
  '/': { kilobytes: 20_000, contenidoPrincipalMs: 4_000 },
  // El resto sí están en un tamaño razonable; el techo va ceñido para que no se deslicen.
  '/pricing': { kilobytes: 900, contenidoPrincipalMs: 4_000 },
  '/about': { kilobytes: 900, contenidoPrincipalMs: 4_000 },
  '/contact': { kilobytes: 900, contenidoPrincipalMs: 4_000 },
};

test.describe('rendimiento', () => {
  for (const ruta of PANTALLAS) {
    test(`${ruta} entra en el presupuesto de bytes y de tiempo`, async ({ page }) => {
      const medida = await mide(page, `${ANGULAR}${ruta}`);

      // Se informa siempre, pase o falle: el número es el entregable, no el color.
      test.info().annotations.push({
        type: 'medida',
        description:
          `${ruta} — ${Math.round(medida.bytes / 1024)} kB / ${medida.peticiones} pet. / ` +
          `${Math.round(medida.contenidoPrincipal)} ms hasta el contenido principal`,
      });

      const techo = PRESUPUESTO[ruta];
      expect(techo, `falta el presupuesto declarado de ${ruta}`).toBeDefined();
      expect(
        Math.round(medida.bytes / 1024),
        `${ruta} descarga más de lo presupuestado`,
      ).toBeLessThanOrEqual(techo.kilobytes);
      expect(
        Math.round(medida.contenidoPrincipal),
        `${ruta} tarda de más en enseñar el contenido principal`,
      ).toBeLessThanOrEqual(techo.contenidoPrincipalMs);
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
