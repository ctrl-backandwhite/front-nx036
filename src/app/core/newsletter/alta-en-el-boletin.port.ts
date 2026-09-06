import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';

/**
 * El alta en el boletín, como capacidad TRANSVERSAL del sitio.
 *
 * <p>Vive en el núcleo y no en un contexto porque la piden dos sitios que no se pueden ver entre sí: el
 * PIE, que sale en todas las pantallas del escaparate y lo monta `layout`, y la sección de la PORTADA,
 * que es del catálogo. Colgarla de un contexto obliga al otro a cruzar la frontera o a duplicar el
 * adaptador.
 *
 * <p>Y no es teórico: el formulario del pie llevaba tiempo sin funcionar por esto. El marco reemitía la
 * salida hacia arriba y arriba no la ataba nadie, así que el campo se limpiaba, la persona veía que
 * «había pasado algo» y al backend no llegaba NADA. Un formulario que finge es peor que uno que falla.
 */
export interface AltaEnElBoletin {
  readonly yaEstaba: boolean;
}

export interface AltaEnElBoletinPort {
  suscribe(correo: string): Promise<Result<AltaEnElBoletin, AppError>>;
}

export const ALTA_EN_EL_BOLETIN = new InjectionToken<AltaEnElBoletinPort>('AltaEnElBoletin');
