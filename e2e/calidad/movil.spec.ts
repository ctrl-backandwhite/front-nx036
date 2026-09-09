import { test } from '@playwright/test';
import {
  ANGULAR,
  bajaAlFondo,
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

  /*
   * AQUÍ HABÍA una prueba que exigía «no añadir objetivos más pequeños que los del front anterior».
   * Se retira con él (9-sep-2026): heredaba en silencio todos los suyos, incluidos los botones de
   * icono de 30 px que su comentario declaraba. El mismo requisito, ya en absoluto y con la deuda
   * declarada, se certifica en `acciones/movil.spec.ts`, que además cubre las pantallas con sesión.
   */
});
