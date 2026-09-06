import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { CotizacionDeCarrito, ItemACotizar } from '../model/cotizacion-de-carrito';

/**
 * Cuánto vale la cesta AHORA MISMO, con el precio que de verdad se va a facturar.
 *
 * <p>Una sola capacidad y un solo método: el precio se calcula ENTERO en el servidor —margen, cambio del
 * día, promoción vigente— y aquí solo se pide y se pinta.
 */
export interface CotizacionDeCarritoPort {
  cotiza(items: readonly ItemACotizar[]): Promise<Result<CotizacionDeCarrito, AppError>>;
}

export const COTIZACION_DE_CARRITO_PORT = new InjectionToken<CotizacionDeCarritoPort>(
  'CotizacionDeCarritoPort',
);
