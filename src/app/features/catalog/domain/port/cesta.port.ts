import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';

/**
 * Lo que el CATÁLOGO necesita SABER de la cesta.
 *
 * <p>Solo una cosa: qué lleva ya, porque es la referencia contra la que el backend calcula cuánto
 * arancel suma cada producto. Sin ella no hay distintivo que pintar.
 *
 * <p>AÑADIR ya no está aquí. Lo estuvo, con su propio `PUT /me/cart`, y por eso había dos cestas: la que
 * escribía el catálogo y la que pintaba la aplicación —insignia de la cabecera y pantalla del carrito—,
 * que no se enteraba. Meter cosas en la cesta es del contexto «cart» y se hace por su contrato público
 * (`ANADIR_AL_CARRITO_PORT`), que además sabe guardar la cesta de quien todavía no ha entrado. Este
 * puerto se queda con la única capacidad que de verdad es una consulta del catálogo, que es lo que pide
 * la segregación de interfaces.
 */
export interface CestaPort {
  productosQueLleva(): Promise<Result<readonly string[], AppError>>;
}

export const CESTA_PORT = new InjectionToken<CestaPort>('CestaPort');
