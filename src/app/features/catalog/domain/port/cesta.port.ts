import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { LineaDeCesta } from '../model/linea-de-cesta';

/**
 * Lo que el CATÁLOGO necesita de la cesta, y nada más.
 *
 * <p>La cesta es otro contexto acotado y sus casos de uso no son visibles desde aquí —con razón: si lo
 * fueran, los dos dejarían de poder evolucionar por separado—. Pero el catálogo tiene dos necesidades
 * reales con ella:
 *
 * <ul>
 *   <li>añadir una línea desde la tarjeta, la vista rápida y la ficha;
 *   <li>saber QUÉ lleva ya, porque es la referencia contra la que el backend calcula cuánto arancel
 *       suma cada producto. Sin ella no hay distintivo que pintar.
 * </ul>
 *
 * <p>Así que se declara aquí el puerto pequeño con esas dos capacidades, tal y como hace «auth» con el
 * resumen de almacenes. Poca duplicación, cero acoplamiento.
 */
export interface CestaPort {
  productosQueLleva(): Promise<Result<readonly string[], AppError>>;
  anade(linea: LineaDeCesta): Promise<Result<void, AppError>>;
}

export const CESTA_PORT = new InjectionToken<CestaPort>('CestaPort');
