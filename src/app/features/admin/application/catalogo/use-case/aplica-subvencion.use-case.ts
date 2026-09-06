import { Injectable, inject } from '@angular/core';
import { AppError, creaError } from '@shared/error/app-error';
import { Result, fallo } from '@shared/result/result';
import {
  PRODUCTOS_MASIVOS_PORT,
  PeticionDeSubvencion,
} from '../../../domain/catalogo/port/productos-admin.port';

/** Un importe presente tiene que ser un número no negativo; ausente significa «no lo toco». */
function invalido(importe?: number): boolean {
  return importe !== undefined && (!Number.isFinite(importe) || importe < 0);
}

/**
 * Fija las dos bolsas de subvención por producto, en yuanes.
 *
 * <p>Son BOLSAS ESTANCAS: la primera se descuenta del envío del pedido y la segunda del arancel, y lo
 * que sobre de una no cubre la otra. Por eso se pueden fijar por separado y la que se deje vacía no se
 * envía —así se puede cambiar el envío sin pisar el arancel—. Sin ningún importe no hay nada que hacer.
 */
@Injectable()
export class AplicaSubvencion {
  private readonly masivos = inject(PRODUCTOS_MASIVOS_PORT);

  ejecuta(peticion: PeticionDeSubvencion): Promise<Result<number, AppError>> {
    const sinImportes = peticion.envioCny === undefined && peticion.arancelCny === undefined;
    if (sinImportes || invalido(peticion.envioCny) || invalido(peticion.arancelCny)) {
      return Promise.resolve(fallo(creaError('peticion-invalida')));
    }
    return this.masivos.fijaSubvencion(peticion);
  }
}
