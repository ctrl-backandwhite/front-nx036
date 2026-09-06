import { Injectable, inject } from '@angular/core';
import { AppError } from '@shared/error/app-error';
import { Result } from '@shared/result/result';
import { FICHA_DE_PRODUCTO_PORT } from '../../../domain/catalogo/port/ficha-de-producto.port';

/**
 * Quita un tramo de precio por cantidad.
 *
 * <p>Se identifica por su CANTIDAD MÍNIMA porque es lo que lo hace único dentro del producto: los
 * tramos no tienen identificador propio, vienen declarados por el proveedor.
 */
@Injectable()
export class EliminaTramoDePrecio {
  private readonly ficha = inject(FICHA_DE_PRODUCTO_PORT);

  ejecuta(productoId: string, cantidadMinima: number): Promise<Result<void, AppError>> {
    return this.ficha.eliminaTramo(productoId, cantidadMinima);
  }
}
