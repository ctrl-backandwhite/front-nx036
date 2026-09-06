import { expect, test } from '@playwright/test';
import { ANGULAR, REACT } from '../util/comparador';
import { RUTAS_PRIVADAS, RUTAS_PUBLICAS } from '../util/rutas';

/**
 * Dimensión D: que el prerenderizado sea de verdad.
 *
 * <p>Es el fundamento de la arquitectura elegida: si el HTML de las páginas públicas no llega ya
 * pintado, no se han recuperado las etiquetas de compartir —que era la razón de montarlo— y se está
 * pagando la complejidad del prerenderizado sin cobrar su beneficio.
 *
 * <p>Se comprueba con el navegador SIN JavaScript. Es la única forma honesta: con JavaScript activado
 * no se distingue una página que llegó pintada de una que se pintó en un milisegundo.
 */

const sinParametro = (r: string) => !r.includes(':');

test.describe('el HTML llega pintado', () => {
  test.use({ javaScriptEnabled: false });

  for (const ruta of RUTAS_PUBLICAS.filter(sinParametro)) {
    test(`${ruta} tiene contenido sin ejecutar JavaScript`, async ({ page }) => {
      await page.goto(`${ANGULAR}${ruta}`, { waitUntil: 'domcontentloaded' });
      const texto = (await page.locator('body').innerText()).trim();

      /* Un umbral bajo a propósito: no se afirma qué DICE la página, solo que dice algo. El primer
       * intento pedía 200 caracteres y marcaba la pantalla de restablecer contraseña, que llega
       * legítimamente con 115 porque es un formulario de un solo campo. Lo que hay que distinguir es
       * «llegó pintada» de «llegó el esqueleto vacío», y un esqueleto no pasa de dos o tres palabras. */
      expect(texto.length, `${ruta} llega vacía: no se está prerenderizando`).toBeGreaterThan(80);
    });
  }

  test('la ficha de producto lleva su título y su descripción para compartir', async ({ page, request }) => {
    // El identificador se resuelve contra el backend: fijarlo a mano lo rompe en cuanto se limpian datos.
    // El listado del catálogo EXIGE SESIÓN: devolvía 401 con cuerpo vacío y `json()` reventaba con
    // «Unexpected end of JSON input», que no dice nada de lo que se estaba certificando. Las secciones
    // de la portada son públicas y llevan productos reales, que es lo único que hace falta aquí.
    const respuesta = await request.get(`${REACT}/api/catalog/home/sections`);
    const cuerpo = await respuesta.json().catch(() => null);
    const slug = JSON.stringify(cuerpo ?? {}).match(/"slug"\s*:\s*"([^"]+)"/)?.[1];
    test.skip(!slug, 'no hay productos en la base local: no se puede certificar la ficha');

    await page.goto(`${ANGULAR}/catalog/${slug}`, { waitUntil: 'domcontentloaded' });

    const titulo = await page.locator('meta[property="og:title"]').getAttribute('content');
    const imagen = await page.locator('meta[property="og:image"]').getAttribute('content');

    expect(titulo, 'la ficha no lleva título para compartir: era la razón de prerenderizar').toBeTruthy();
    expect(titulo).not.toContain('NX036 —'); // el genérico de la portada, no el del producto
    expect(imagen, 'la ficha no lleva imagen para compartir').toBeTruthy();
  });

  /**
   * Lo contrario también importa: una pantalla con sesión NO puede llegar prerenderizada, o su
   * esqueleto acabaría cacheado en el borde y servido a quien no debe.
   */
  for (const ruta of RUTAS_PRIVADAS.filter(sinParametro).slice(0, 6)) {
    test(`${ruta} NO se prerenderiza`, async ({ page }) => {
      await page.goto(`${ANGULAR}${ruta}`, { waitUntil: 'domcontentloaded' });
      const texto = (await page.locator('body').innerText()).trim();
      expect(
        texto.length,
        `${ruta} llega con contenido escrito: depende de quién mira y no puede prerenderizarse`,
      ).toBeLessThan(200);
    });
  }
});
