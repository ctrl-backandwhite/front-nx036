import { EnvironmentProviders, Provider } from '@angular/core';
import { provideClientHydration, withIncrementalHydration } from '@angular/platform-browser';

/**
 * Proveedores presentes en TODAS las pruebas.
 *
 * <p>La hidratación incremental está aquí porque la aplicación la declara, y sin ella cualquier bloque
 * `@defer (hydrate on ...)` avisa con `NG0508` y **no se pinta**. Como la norma de rendimiento del
 * proyecto pide diferir todo lo que queda bajo el pliegue, eso deja media pantalla fuera de la prueba y
 * el fallo se lee como «no encuentro este texto», sin mencionar el diferido por ninguna parte.
 *
 * <p>Que en una prueba no haya realmente nada que hidratar no importa: lo que se necesita es que los
 * bloques se comporten igual que en el navegador. Ponerlo aquí evita repetirlo en trescientos ficheros y,
 * sobre todo, evita que la prueba de una pantalla dependa de que alguien se acordara.
 */
const proveedores: (Provider | EnvironmentProviders)[] = [
  provideClientHydration(withIncrementalHydration()),
];

export default proveedores;
