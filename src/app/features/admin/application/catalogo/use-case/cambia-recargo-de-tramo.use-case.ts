import { Injectable, inject } from '@angular/core';
import { AppError } from '@shared/error/app-error';
import { Result } from '@shared/result/result';
import { FICHA_DE_PRODUCTO_PORT } from '../../../domain/catalogo/port/ficha-de-producto.port';

/**
 * Fija el recargo de un tramo de precio por cantidad.
 *
 * <p>El recargo era uno solo para todo el producto y se cobraba igual a quien se lleva una unidad que
 * a quien se lleva diez mil. Pero lo que cubre —la gestión de la compra, el manipulado, la parte fija
 * del despacho— no crece con la cantidad, así que repetirlo encarecía el pedido grande justo donde la
 * tabla de cantidades promete lo contrario. El envío y el arancel siguen siendo uno por producto:
 * esos sí escalan con el bulto.
 *
 * <p>El tramo se identifica por su CANTIDAD MÍNIMA, igual que al borrarlo: no tienen identificador
 * propio, vienen declarados por el proveedor.
 */
@Injectable()
export class CambiaRecargoDeTramo {
  private readonly ficha = inject(FICHA_DE_PRODUCTO_PORT);

  ejecuta(
    productoId: string,
    cantidadMinima: number,
    recargoCny: number | null,
  ): Promise<Result<void, AppError>> {
    return this.ficha.cambiaRecargoDeTramo(productoId, cantidadMinima, recargoCny);
  }
}
