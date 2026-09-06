import { expect, test } from '@playwright/test';
import {
  ANGULAR,
  REACT,
  bajaAlFondo,
  objetivosTactilesPequenos,
  sinDesplazamientoHorizontal,
  abre,
} from '../util/comparador';
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
  /* Estas comprobaciones solo tienen sentido a la anchura de un móvil.
   *
   * Va en un `beforeEach` y no en `test.skip(callback)` a nivel de bloque: ahí el segundo argumento NO
   * es la información de la prueba, así que leer `info.project` reventaba con «no se puede leer
   * 'project' de undefined» — y al reventar en la primera, las diecinueve siguientes NI SE EJECUTABAN.
   * Aparecían como «no ejecutadas» en el informe, que es la peor forma de fallar: un hueco de cobertura
   * que no se lee como un fallo. */
  test.beforeEach(({ }, info) => {
    test.skip(info.project.name !== 'movil', 'solo aplica a la anchura de móvil');
  });

  for (const ruta of RUTAS_PUBLICAS.filter(sinParametro)) {
    test(`${ruta} cabe en la pantalla sin desplazarse en horizontal`, async ({ page }) => {
      await abre(page, `${ANGULAR}${ruta}`);
      // Se baja antes de medir: lo que está diferido no existe hasta que entra en pantalla, y un
      // desborde del pie no se vería.
      await bajaAlFondo(page);
      await sinDesplazamientoHorizontal(page);
    });
  }

  for (const ruta of RUTAS_PUBLICAS.filter(sinParametro)) {
    test(`${ruta} no empeora lo que se puede pulsar`, async ({ page }) => {
      /* Se compara CONTRA el front anterior, no contra un ideal.
       *
       * Medir en absoluto marcaba media aplicación —y también la del original—, porque hay botones de
       * icono heredados de 30 píxeles. Eso no es un defecto del porte: es el diseño que hay, y
       * cambiarlo sería justo lo contrario de lo que se pidió. Lo que sí sería un defecto es que el
       * porte AÑADA objetivos más pequeños que los que ya había. */
      // Se compara por lo que ES el elemento, no por sus medidas exactas: un píxel de diferencia en la
      // altura lo convertía en «un objetivo nuevo» y llenaba el informe de falsos positivos.
      const soloElNombre = (x: string) => x.replace(/\s*\(\d+×\d+\)$/, '');

      await abre(page, `${REACT}${ruta}`);
      await bajaAlFondo(page);
      const enReact = new Set((await objetivosTactilesPequenos(page)).map(soloElNombre));

      await abre(page, `${ANGULAR}${ruta}`);
      await bajaAlFondo(page);
      const nuevos = (await objetivosTactilesPequenos(page)).filter((x) => !enReact.has(soloElNombre(x)));

      expect(nuevos, `objetivos difíciles de pulsar que el original no tenía: ${nuevos.slice(0, 4).join(' · ')}`)
        .toEqual([]);
    });
  }
});
