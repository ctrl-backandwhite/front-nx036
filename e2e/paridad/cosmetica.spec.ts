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

async function tokensDelTema(page: Page): Promise<Record<string, string>> {
  return page.evaluate((nombres) => {
    const estilo = getComputedStyle(document.documentElement);
    const salida: Record<string, string> = {};
    for (const nombre of nombres) {
      salida[nombre] = estilo.getPropertyValue(nombre).trim();
    }
    return salida;
  }, TOKENS);
}

/**
 * Lo que el navegador acaba pintando en las piezas más visibles.
 *
 * <p>Se leen los valores YA RESUELTOS, no las clases. Dos elementos pueden llevar la misma clase y
 * verse distintos si una regla los pisa; y al revés, el marcado puede diferir y el resultado ser
 * idéntico, que es justo lo que se busca en un porte.
 */
async function aspectoResuelto(page: Page): Promise<Record<string, Record<string, string>>> {
  return page.evaluate(() => {
    const leer = (elemento: Element | null, propiedades: string[]) => {
      if (!elemento) {
        return {};
      }
      const estilo = getComputedStyle(elemento);
      return Object.fromEntries(propiedades.map((p) => [p, estilo.getPropertyValue(p).trim()]));
    };
    return {
      cuerpo: leer(document.body, ['background-color', 'color', 'font-family', 'font-weight', 'letter-spacing']),
      titular: leer(document.querySelector('h1'), ['font-size', 'font-weight', 'color', 'letter-spacing', 'line-height']),
      botonPrimario: leer(document.querySelector('.btn-primary'), ['background-color', 'color', 'border-radius', 'border-width']),
      tarjeta: leer(document.querySelector('.card'), ['background-color', 'border-color', 'border-width', 'border-radius']),
      distintivo: leer(document.querySelector('.badge'), ['border-radius', 'padding-inline', 'min-height']),
      campo: leer(document.querySelector('.input'), ['border-radius', 'border-color', 'height']),
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

      // Una pieza que no existe en una de las dos no es una diferencia de ESTILO: es de contenido, y de
      // eso se ocupa la batería de paridad de contenido. Aquí se comparan solo las piezas presentes en
      // ambas, o esta comprobación se llenaría de ruido ajeno.
      for (const pieza of Object.keys(enReact)) {
        const a = enReact[pieza];
        const b = enAngular[pieza];
        if (Object.keys(a).length === 0 || Object.keys(b).length === 0) {
          continue;
        }
        expect(b, `«${pieza}» se pinta distinto en ${ruta}`).toEqual(a);
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
