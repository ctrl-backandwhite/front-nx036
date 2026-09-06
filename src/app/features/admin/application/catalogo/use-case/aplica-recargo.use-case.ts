import { Injectable, inject } from '@angular/core';
import { AppError } from '@shared/error/app-error';
import { Result, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import {
  PRODUCTOS_MASIVOS_PORT,
  PeticionDeRecargo,
} from '../../../domain/catalogo/port/productos-admin.port';

/**
 * Fija el recargo fijo por producto, en yuanes.
 *
 * <p>Es una de las palancas del precio y se suma al de venta tal cual, como el IVA o el envío. Cero lo
 * quita; un importe negativo no significa nada y se rechaza aquí antes de mandarlo.
 */
@Injectable()
export class AplicaRecargo {
  private readonly masivos = inject(PRODUCTOS_MASIVOS_PORT);

  ejecuta(peticion: PeticionDeRecargo): Promise<Result<number, AppError>> {
    if (!Number.isFinite(peticion.recargoCny) || peticion.recargoCny < 0) {
      return Promise.resolve(fallo(creaError('peticion-invalida')));
    }
    return this.masivos.fijaRecargo(peticion);
  }
}
