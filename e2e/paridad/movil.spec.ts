import { expect, test } from '@playwright/test';
import { ANGULAR, objetivosTactilesSuficientes, sinDesplazamientoHorizontal } from '../util/comparador';
import { RUTAS_PUBLICAS } from '../util/rutas';

/**
 * Dimensión D, parte móvil.
 *
 * <p>El proyecto es mobile first por norma, así que esto no es una comprobación de última hora: es la
 * que delata un diseño pensado para el escritorio y encogido después. Los dos síntomas que lo cantan
 * son el desplazamiento horizontal —una tabla sin contenedor propio, una imagen con ancho fijo, una
 * rejilla que no baja a una columna— y los objetivos que no se pueden pulsar con un dedo.
 */

const sinParametro = (r: string) => !r.includes(':');

test.describe('la web en el móvil', () => {
  test.skip(({ }, info) => info.project.name !== 'movil', 'solo aplica a la anchura de móvil');

  for (const ruta of RUTAS_PUBLICAS.filter(sinParametro)) {
    test(`${ruta} cabe en la pantalla sin desplazarse en horizontal`, async ({ page }) => {
      await page.goto(`${ANGULAR}${ruta}`, { waitUntil: 'networkidle' });
      await sinDesplazamientoHorizontal(page);
    });
  }

  for (const ruta of RUTAS_PUBLICAS.filter(sinParametro)) {
    test(`${ruta} se puede usar con el dedo`, async ({ page }) => {
      await page.goto(`${ANGULAR}${ruta}`, { waitUntil: 'networkidle' });
      const pequenos = await objetivosTactilesSuficientes(page);
      expect(pequenos, `hay elementos por debajo de 44 px: ${pequenos.slice(0, 5).join(' · ')}`).toEqual([]);
    });
  }
});
