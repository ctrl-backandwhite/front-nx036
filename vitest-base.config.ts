import { defineConfig } from 'vitest/config';

/**
 * Lo mínimo que NO cabe en `angular.json`.
 *
 * <p>El constructor `@angular/build:unit-test` arma casi toda la configuración de Vitest a partir de las
 * opciones del proyecto, y es el sitio donde hay que tocar: aquí solo va lo que aquellas opciones no
 * exponen. Las claves `test.include` y `test.exclude` NO se pueden poner aquí —el propio constructor las
 * descarta con un aviso—, así que este fichero se queda a propósito en una sola línea de contenido.
 */
export default defineConfig({
  test: {
    /*
     * Plazo por prueba: treinta segundos en vez de cinco.
     *
     * <p>No es para tapar nada. Las 374 baterías corren en paralelo sobre la misma máquina y varias
     * montan pantallas enteras o descargan módulos diferidos; con el equipo cargado, pruebas que tardan
     * decenas de milisegundos en solitario se van a varios segundos solo por esperar turno de CPU. El
     * síntoma era el peor posible: fallaban pruebas DISTINTAS en cada pasada y todas pasaban en
     * solitario. Una prueba que de verdad se cuelgue sigue fallando, solo que más tarde.
     */
    testTimeout: 30_000,

    /*
     * Se deja un núcleo libre.
     *
     * <p>Con un proceso por núcleo, las 383 baterías compiten con el propio compilador y con lo que
     * corra en la máquina, y alguna se queda sin turno el tiempo suficiente para agotar su plazo. El
     * síntoma era el de siempre: fallaba una batería DISTINTA en cada pasada y todas pasaban en
     * solitario. Un proceso menos apenas cambia el reloj total —el cuello no es el paralelismo, es el
     * disco y la compilación— y quita la contención que hacía impredecible el resultado.
     */
    maxWorkers: Math.max(2, (globalThis.navigator?.hardwareConcurrency ?? 4) - 1),
    coverage: {
      /*
       * Que el informe se escriba AUNQUE alguna prueba falle.
       *
       * Vitest no lo hace por defecto, y esa es la razón de que medir la cobertura no diera número dos
       * veces seguidas: bastaba una prueba intermitente para quedarse sin informe y sin explicación, con
       * el directorio `coverage/` recién creado y vacío. La cobertura de las otras 2.954 pruebas sigue
       * siendo un dato útil cuando una falla; perderla entera es lo que no tiene sentido.
       */
      reportOnFailure: true,
    },
  },
});
