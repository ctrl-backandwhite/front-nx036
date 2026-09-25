import { Injectable, inject } from '@angular/core';
import { AppError } from '@shared/error/app-error';
import { Result, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import {
  PRODUCTOS_MASIVOS_PORT,
  PeticionDeRecargo,
} from '../../../domain/catalogo/port/productos-admin.port';

/**
 * Fija el recargo por producto, en porcentaje sobre el coste del proveedor.
 *
 * <p>Es una de las palancas del precio y se suma al de venta SIN margen encima. Cero lo quita; un
 * porcentaje negativo no significa nada y se rechaza aquí antes de mandarlo.
 *
 * <p>Porcentaje desde el 25-sep-2026: como importe fijo en yuanes no seguía al coste, así que al subir
 * el proveedor el precio había que rehacerlo a mano producto a producto.
 */
@Injectable()
export class AplicaRecargo {
  private readonly masivos = inject(PRODUCTOS_MASIVOS_PORT);

  ejecuta(peticion: PeticionDeRecargo): Promise<Result<number, AppError>> {
    if (!Number.isFinite(peticion.recargoPct) || peticion.recargoPct < 0) {
      return Promise.resolve(fallo(creaError('peticion-invalida')));
    }
    return this.masivos.fijaRecargo(peticion);
  }
}
