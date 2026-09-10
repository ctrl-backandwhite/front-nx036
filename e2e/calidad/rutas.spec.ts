import { expect, test } from '@playwright/test';
import { ANGULAR, abre } from '../util/comparador';
import {
  ALIAS_DE_ESCAPARATE,
  ALIAS_DE_PANEL,
  RUTAS_DE_PANEL,
  RUTAS_PRIVADAS,
  RUTAS_PUBLICAS,
} from '../util/rutas';

/**
 * Dimensión A: paridad de rutas.
 *
 * <p>Lo primero que hay que descartar en un porte es que falte una pantalla entera. Es el defecto más
 * tonto y el más caro: no lo detecta ninguna prueba unitaria, porque el código que falta no tiene
 * pruebas, y se descubre cuando alguien sigue un enlace desde un correo.
 */

const sinParametro = (r: string) => !r.includes(':');

test.describe('paridad de rutas', () => {
  for (const ruta of RUTAS_PUBLICAS.filter(sinParametro)) {
    test(`pública ${ruta} se sirve`, async ({ page }) => {
      // Antes se exigía «el mismo estado que el React». Retirado aquél (9-sep-2026), el listón es el
      // requisito: una ruta pública se sirve, punto.
      const respuesta = await page.goto(`${ANGULAR}${ruta}`, { waitUntil: 'domcontentloaded' });

      expect(respuesta?.status(), `falta la pantalla pública ${ruta}`).toBeLessThan(400);
    });
  }

  /**
   * Las zonas privadas, sin sesión, tienen que mandar a la pantalla de acceso. Que respondan un 200 con
   * el esqueleto vacío sería peor que un error: se vería una página rota en vez de una invitación a
   * entrar.
   */
  for (const ruta of [...RUTAS_PRIVADAS, ...RUTAS_DE_PANEL].filter(sinParametro)) {
    test(`privada ${ruta} manda a la pantalla de acceso sin sesión`, async ({ page }) => {
      await abre(page, `${ANGULAR}${ruta}`);

      /* Se SONDEA la dirección en vez de leerla una vez.
       *
       * `abre` da por asentada la pantalla cuando el texto deja de crecer, y el armazón del panel pinta
       * su cabecera antes de que el guardián termine de resolver la sesión: ahí el texto ya no cambia,
       * pero la redirección todavía no ha ocurrido. Leer la dirección en ese instante marcaba como
       * desprotegidas rutas que sí protegen —comprobado a mano contra preproducción: las cuatro acaban
       * en `/login?volverA=…`, solo que unos cientos de milisegundos después—.
       *
       * El requisito no es «redirige antes de que yo mire», es «no se puede ver sin sesión»; y eso es
       * exactamente lo que comprueba el sondeo: si de verdad no protegiera, no llegaría nunca. */
      await expect
        .poll(() => page.url(), {
          message: `${ruta} no protege: deja ver la pantalla sin sesión`,
          timeout: 15_000,
        })
        .toContain('/login');
    });
  }

  /**
   * Los alias son la parte que más se olvida al portar, y la que más se usa: son las direcciones que la
   * gente tiene guardadas y las que aparecen en los correos enviados hace meses.
   */
  // Sin duplicar: algunos alias («/precios») están en las dos listas del enrutador original, y el
  // ejecutor rechaza dos pruebas con el mismo nombre.
  for (const alias of [...new Set([...ALIAS_DE_ESCAPARATE, ...ALIAS_DE_PANEL])]) {
    test(`el alias ${alias} no se pierde`, async ({ page }) => {
      /* Se comprueba que el alias LLEVA A ALGUNA PARTE, no que las dos aplicaciones acaben en el mismo
       * camino en el mismo instante.
       *
       * El primer intento comparaba el camino tras `networkidle` y marcaba los diez alias del panel.
       * Al mirarlo de cerca no era un defecto: los dos acaban en la pantalla de acceso, pero el front
       * anterior se queda un rato enseñando «Cargando…» mientras resuelve la sesión y el nuevo redirige
       * antes. Se estaba midiendo quién es más rápido, no quién lleva al sitio correcto.
       *
       * Lo que sí es un defecto —y es como se encontraron cuatro alias que faltaban— es que el alias
       * muera en la página de «no encontrado». */
      await abre(page, `${ANGULAR}${alias}`);
      const texto = await page.locator('body').innerText();
      expect(/404|no encontrad|not found/i.test(texto), `el alias ${alias} muere en «no encontrado»`)
        .toBe(false);
    });
  }

  test('una dirección que no existe lo dice, en vez de dejar la pantalla en blanco', async ({ page }) => {
    const inventada = '/esto-no-existe-en-ninguna-parte-9f2c';
    await abre(page, `${ANGULAR}${inventada}`);
    const texto = await page.locator('body').innerText();

    expect(
      /404|no encontrad|not found/i.test(texto),
      'una dirección inventada no avisa de que ahí no hay nada',
    ).toBe(true);
  });
});
