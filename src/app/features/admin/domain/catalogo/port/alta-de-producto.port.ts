import { InjectionToken } from '@angular/core';
import { AppError } from '@shared/error/app-error';
import { Result } from '@shared/result/result';
import { ProductoNuevo } from '../model/producto-nuevo';

/**
 * El alta manual de un producto.
 *
 * <p>Devuelve el identificador del producto creado, que es lo que hace falta para llevar a su ficha: sin
 * él, quien acaba de rellenar cuarenta campos se queda en el listado buscándolo.
 */
export interface AltaDeProductoPort {
  crea(producto: ProductoNuevo): Promise<Result<string, AppError>>;
}

export const ALTA_DE_PRODUCTO_PORT = new InjectionToken<AltaDeProductoPort>('AltaDeProductoPort');
