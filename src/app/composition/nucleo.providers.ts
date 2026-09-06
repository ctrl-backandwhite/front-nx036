import { EnvironmentProviders, makeEnvironmentProviders, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ALMACEN_LOCAL } from '@core/storage/almacen.port';
import { AlmacenLocalAdapter } from '@core/storage/almacen-local.adapter';
import { AlmacenMemoriaAdapter } from '@core/storage/almacen-memoria.adapter';

/**
 * La raíz de composición: el ÚNICO sitio donde se decide qué implementación cumple cada puerto.
 *
 * <p>Es lo que hace que el resto del código dependa de contratos y no de detalles. Cambiar dónde se
 * guardan las preferencias, o poner un doble en una prueba, se hace aquí y no buscando por todo el
 * proyecto quién llamaba a qué.
 *
 * <p>Cada contexto acotado aporta su propio fichero de proveedores (`<contexto>.providers.ts`) y todos se
 * juntan en `app.config.ts`. Así, añadir un contexto no obliga a tocar un fichero central que crece sin
 * parar y que todo el mundo edita a la vez.
 */
export function proveeNucleo(): EnvironmentProviders {
  return makeEnvironmentProviders([
    AlmacenLocalAdapter,
    AlmacenMemoriaAdapter,
    {
      provide: ALMACEN_LOCAL,
      // Al PRERENDERIZAR no hay navegador: el almacén de memoria evita tener que preguntar «¿hay
      // localStorage?» en cada sitio que guarda algo. La pregunta se hace UNA vez, aquí.
      useFactory: () =>
        isPlatformBrowser(inject(PLATFORM_ID))
          ? inject(AlmacenLocalAdapter)
          : inject(AlmacenMemoriaAdapter),
    },
  ]);
}
