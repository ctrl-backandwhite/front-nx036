import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { BorradorDePromocion, Promocion } from '../model/promociones';
import { OpcionDeAmbito } from './precios.port';

/**
 * Rebajas y cupones.
 *
 * <p>`anuncia` manda una notificación a todos los usuarios: es una acción con consecuencias fuera de la
 * aplicación y por eso está separada de `guarda`. Que fuera una casilla del formulario haría que cada
 * corrección de una errata volviera a avisar a todo el mundo.
 */
export interface PromocionesPort {
  lista(): Promise<Result<readonly Promocion[], AppError>>;
  crea(borrador: BorradorDePromocion): Promise<Result<void, AppError>>;
  actualiza(id: string, borrador: BorradorDePromocion): Promise<Result<void, AppError>>;
  alterna(id: string): Promise<Result<void, AppError>>;
  anuncia(id: string): Promise<Result<number, AppError>>;
  borra(id: string): Promise<Result<void, AppError>>;
  /** Las categorías a las que se puede acotar una promoción, por nombre. */
  categorias(): Promise<Result<readonly OpcionDeAmbito[], AppError>>;
}

export const PROMOCIONES_PORT = new InjectionToken<PromocionesPort>('PromocionesPort');
