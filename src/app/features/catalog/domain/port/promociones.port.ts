import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { PromocionViva } from '../model/catalogo-auxiliar';

/**
 * Las rebajas que se anuncian en la portada.
 *
 * <p>Solo llegan las AUTOMÁTICAS: los cupones exigen teclear un código y anunciarlos aquí los
 * regalaría a todo el mundo.
 */
export interface PromocionesPort {
  vivas(): Promise<Result<readonly PromocionViva[], AppError>>;
}

export const PROMOCIONES_PORT = new InjectionToken<PromocionesPort>('PromocionesPort');
