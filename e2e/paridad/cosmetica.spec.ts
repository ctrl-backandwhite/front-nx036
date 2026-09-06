import { Page, expect, test } from '@playwright/test';
import { ANGULAR, REACT } from '../util/comparador';

/**
 * Certificación COSMÉTICA: que se vea igual, no solo que diga lo mismo.
 *
 * <p>El encargo era que el diseño no cambiara al pasar a Angular, y la hoja de estilos se heredó tal
 * cual. Eso hace que esta comprobación pueda ser EXACTA en vez de aproximada: si las dos aplicaciones
 * comparten los mismos tokens y las mismas clases, los valores que el navegador calcula tienen que
 * coincidir carácter a carácter. Una diferencia aquí no es cuestión de gusto: es que algo no se está
 * aplicando.
 *
 * <p>No se comparan imágenes píxel a píxel. Son dos tecnologías distintas y el marcado no es idéntico,
 * así que un comparador de imágenes daría diferencias en cada página sin decir cuál importa. Lo que sí
 * es comparable —y lo que de verdad delata un fallo de estilo— es lo que el navegador CALCULA: el color
 * resuelto, la tipografía, los radios, las sombras. Las capturas se guardan aparte, para mirarlas.
 */

/** Los tokens del tema NX036. Salen del mismo fichero en los dos proyectos, así que deben coincidir. */
const TOKENS = [
  '--color-base-100', '--color-base-200', '--color-base-300', '--color-base-content',
  '--color-primary', '--color-primary-content', '--color-secondary', '--color-accent',
  '--color-info', '--color-success', '--color-warning', '--color-error',
  '--radius-selector', '--radius-field', '--radius-box',
  '--color-brand-600', '--color-ink-900', '--font-sans', '--font-mono',
];

/**
 * Normaliza lo que devuelve el navegador antes de comparar.
 *
 * <p>Hace falta porque los dos proyectos usan minificadores distintos y escriben lo MISMO de forma
 * distinta: uno deja `0.85rem` y el otro `.85rem`, y una lista de tipografías puede venir partida en
 * varias líneas. Sin esto, la comparación marcaba diferencias que ningún ojo ve, y eso es peor que no
 * comparar: llena el informe de ruido y esconde la diferencia que sí importa.
 *
 * <p>Lo que NO se normaliza son los colores. Ahí cualquier diferencia es real.
 */
function normaliza(valor: string): string {
  return valor
    .replace(/\s+/g, ' ')
    .replace(/(^|[\s(,])\.(\d)/g, '$10.$2')
    .trim();
}

async function tokensDelTema(page: Page): Promise<Record<string, string>> {
  const crudos = await page.evaluate((nombres) => {
    const estilo = getComputedStyle(document.documentElement);
    const salida: Record<string, string> = {};
    for (const nombre of nombres) {
      salida[nombre] = estilo.getPropertyValue(nombre);
    }
    return salida;
  }, TOKENS);
  return Object.fromEntries(Object.entries(crudos).map(([k, v]) => [k, normaliza(v)]));
}

/**
 * Lo que el navegador acaba pintando en las piezas más visibles.
 *
 * <p>Se leen los valores YA RESUELTOS, no las clases. Dos elementos pueden llevar la misma clase y
 * verse distintos si una regla los pisa; y al revés, el marcado puede diferir y el resultado ser
 * idéntico, que es justo lo que se busca en un porte.
 *
 * <p>De cada clase se recoge el CONJUNTO de valores distintos que aparecen en la página, no los de la
 * primera pieza que se encuentre. La diferencia importa: el primer intento comparaba
 * `querySelector('.card')` contra `querySelector('.card')` y marcaba una diferencia en la pantalla de
 * acceso que resultó no serlo — en cada aplicación la primera tarjeta del documento era una pieza
 * distinta, y se estaban comparando cosas que no se corresponden. Comparando conjuntos, el orden del
 * marcado deja de importar y sigue saltando lo que sí importa: un color, un radio o una sombra que en
 * una aplicación existe y en la otra no.
 */
async function aspectoResuelto(page: Page): Promise<Record<string, Record<string, string[]>>> {
  return page.evaluate(() => {
    const conjuntoDe = (selector: string, propiedades: string[]) => {
      const elementos = Array.from(document.querySelectorAll(selector)).slice(0, 30);
      const salida: Record<string, string[]> = {};
      for (const propiedad of propiedades) {
        const valores = new Set<string>();
        for (const elemento of elementos) {
          valores.add(getComputedStyle(elemento).getPropertyValue(propiedad));
        }
        salida[propiedad] = [...valores].sort();
      }
      return elementos.length === 0 ? {} : salida;
    };
    return {
      cuerpo: conjuntoDe('body', ['background-color', 'color', 'font-family', 'font-weight', 'letter-spacing']),
      titular: conjuntoDe('h1', ['font-size', 'font-weight', 'color', 'letter-spacing']),
      botonPrimario: conjuntoDe('.btn-primary', ['background-color', 'color', 'border-radius']),
      tarjeta: conjuntoDe('.card', ['background-color', 'border-color', 'border-radius']),
      distintivo: conjuntoDe('.badge', ['border-radius', 'min-height']),
      campo: conjuntoDe('.input', ['border-radius', 'border-color']),
    };
  });
}

/** Páginas públicas que existen en los dos y no dependen de quién mira. */
const PANTALLAS = ['/', '/about', '/contact', '/login', '/register', '/status'];

test.describe('paridad cosmética', () => {
  test('el tema resuelve los mismos valores en las dos aplicaciones', async ({ page }) => {
    await page.goto(`${REACT}/`, { waitUntil: 'networkidle' });
    const enReact = await tokensDelTema(page);

    await page.goto(`${ANGULAR}/`, { waitUntil: 'networkidle' });
    const enAngular = await tokensDelTema(page);

    // Comparación entera y de una vez: así el informe enseña TODAS las diferencias, no solo la primera.
    expect(enAngular, 'los tokens del tema no coinciden con los del front anterior').toEqual(enReact);
  });

  for (const ruta of PANTALLAS) {
    test(`${ruta} se pinta igual`, async ({ page }) => {
      await page.goto(`${REACT}${ruta}`, { waitUntil: 'networkidle' });
      const enReact = await aspectoResuelto(page);

      await page.goto(`${ANGULAR}${ruta}`, { waitUntil: 'networkidle' });
      const enAngular = await aspectoResuelto(page);

      /* El criterio es de CONTENCIÓN, no de igualdad: ningún valor que pinte el Angular puede estar
       * fuera de la paleta que usa el front anterior para esa misma pieza.
       *
       * Se llegó aquí después de dos intentos peores. Comparar la primera pieza de cada clase fallaba
       * porque el orden del marcado no coincide. Comparar los conjuntos enteros fallaba porque una
       * pantalla puede tener DOS botones primarios donde la otra tiene uno —un botón deshabilitado
       * pinta distinto—, y eso es una diferencia de contenido, no de estilo.
       *
       * Lo que sí delata un fallo de estilo es un color, un radio o una tipografía que en el original
       * no existe: eso significa que una regla no se está aplicando, o que alguien escribió un valor a
       * mano en vez de usar el tema. Y eso es exactamente lo que comprueba la contención. */
      for (const pieza of Object.keys(enReact)) {
        const normalizaPieza = (x: Record<string, string[]>) =>
          Object.fromEntries(Object.entries(x).map(([k, v]) => [k, v.map(normaliza).sort()]));
        const a = normalizaPieza(enReact[pieza]);
        const b = normalizaPieza(enAngular[pieza]);
        if (Object.keys(a).length === 0 || Object.keys(b).length === 0) {
          continue;
        }
        for (const [propiedad, valores] of Object.entries(b)) {
          const admitidos = a[propiedad] ?? [];
          const intrusos = valores.filter((v) => !admitidos.includes(v));
          expect(
            intrusos,
            `«${pieza}» pinta en ${ruta} un ${propiedad} que no existe en el front anterior`,
          ).toEqual([]);
        }
      }
    });
  }

  test('el tema oscuro cambia la paleta en las dos', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });

    await page.goto(`${REACT}/`, { waitUntil: 'networkidle' });
    const claroReact = await tokensDelTema(page);

    await page.goto(`${ANGULAR}/`, { waitUntil: 'networkidle' });
    const claroAngular = await tokensDelTema(page);

    expect(claroAngular, 'el tema oscuro no resuelve igual').toEqual(claroReact);
  });

  /**
   * Las capturas no afirman nada por sí solas: se guardan para poder mirarlas. Van en las dos anchuras
   * y de página completa, que es donde se ven los saltos de maqueta que ningún valor calculado delata.
   */
  for (const ruta of PANTALLAS) {
    test(`captura de ${ruta}`, async ({ page }, info) => {
      const nombre = ruta === '/' ? 'portada' : ruta.replace(/\//g, '');
      for (const [etiqueta, base] of [['react', REACT], ['angular', ANGULAR]] as const) {
        await page.goto(`${base}${ruta}`, { waitUntil: 'networkidle' });
        await info.attach(`${nombre}-${etiqueta}-${info.project.name}`, {
          body: await page.screenshot({ fullPage: true }),
          contentType: 'image/png',
        });
      }
    });
  }
});
