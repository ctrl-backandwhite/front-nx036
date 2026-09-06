import { Injectable, inject } from '@angular/core';
import { AppError, creaError } from '@shared/error/app-error';
import { Result, fallo } from '@shared/result/result';
import { BorradorDeVariante, desdeBorrador } from '../../../domain/catalogo/model/variante-de-producto';
import { VARIANTES_PORT } from '../../../domain/catalogo/port/ficha-de-producto.port';

/**
 * Crea o actualiza una variante.
 *
 * <p>Es la misma acción con o sin identificador: quien la usa rellena el mismo formulario y espera el
 * mismo resultado. Sin SKU no se guarda: es lo que identifica la variante en el pedido y en el almacén.
 */
@Injectable()
export class GuardaVariante {
  private readonly variantes = inject(VARIANTES_PORT);

  ejecuta(
    productoId: string,
    borrador: BorradorDeVariante,
    varianteId?: string,
  ): Promise<Result<void, AppError>> {
    if (!borrador.sku.trim()) {
      return Promise.resolve(fallo(creaError('peticion-invalida')));
    }
    const cambios = desdeBorrador(borrador);
    return varianteId
      ? this.variantes.actualiza(varianteId, cambios)
      : this.variantes.crea(productoId, cambios);
  }
}
