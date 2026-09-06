import { expect, test } from '@playwright/test';
import { ANGULAR, REACT } from '../util/comparador';
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
    test(`pública ${ruta} responde igual en los dos`, async ({ page }) => {
      const enReact = await page.goto(`${REACT}${ruta}`, { waitUntil: 'domcontentloaded' });
      const enAngular = await page.goto(`${ANGULAR}${ruta}`, { waitUntil: 'domcontentloaded' });

      expect(enReact?.status(), `el React no sirve ${ruta}: revisa el catálogo de rutas`).toBeLessThan(400);
      expect(enAngular?.status(), `falta la pantalla ${ruta} en el Angular`).toBe(enReact?.status());
    });
  }

  /**
   * Las zonas privadas, sin sesión, tienen que mandar a la pantalla de acceso. Que respondan un 200 con
   * el esqueleto vacío sería peor que un error: se vería una página rota en vez de una invitación a
   * entrar.
   */
  for (const ruta of [...RUTAS_PRIVADAS, ...RUTAS_DE_PANEL].filter(sinParametro)) {
    test(`privada ${ruta} manda a la pantalla de acceso sin sesión`, async ({ page }) => {
      await page.goto(`${ANGULAR}${ruta}`, { waitUntil: 'networkidle' });
      expect(page.url(), `${ruta} no protege: deja ver la pantalla sin sesión`).toContain('/login');
    });
  }

  /**
   * Los alias son la parte que más se olvida al portar, y la que más se usa: son las direcciones que la
   * gente tiene guardadas y las que aparecen en los correos enviados hace meses.
   */
  // Sin duplicar: algunos alias («/precios») están en las dos listas del enrutador original, y el
  // ejecutor rechaza dos pruebas con el mismo nombre.
  for (const alias of [...new Set([...ALIAS_DE_ESCAPARATE, ...ALIAS_DE_PANEL])]) {
    test(`el alias ${alias} lleva al mismo sitio en los dos`, async ({ page }) => {
      await page.goto(`${REACT}${alias}`, { waitUntil: 'networkidle' });
      const destinoReact = new URL(page.url()).pathname;

      await page.goto(`${ANGULAR}${alias}`, { waitUntil: 'networkidle' });
      const destinoAngular = new URL(page.url()).pathname;

      expect(destinoAngular, `el alias ${alias} no lleva donde debería`).toBe(destinoReact);
    });
  }

  test('una dirección que no existe da la misma página en los dos', async ({ page }) => {
    const inventada = '/esto-no-existe-en-ninguna-parte-9f2c';
    await page.goto(`${REACT}${inventada}`, { waitUntil: 'networkidle' });
    const textoReact = await page.locator('body').innerText();

    await page.goto(`${ANGULAR}${inventada}`, { waitUntil: 'networkidle' });
    const textoAngular = await page.locator('body').innerText();

    // No se comparan letra a letra: basta con que las dos reconozcan que no hay nada ahí.
    const pareceNoEncontrado = (t: string) => /404|no encontrad|not found/i.test(t);
    expect(pareceNoEncontrado(textoReact), 'el React no avisa de que la página no existe').toBe(true);
    expect(pareceNoEncontrado(textoAngular), 'el Angular no avisa de que la página no existe').toBe(true);
  });
});
