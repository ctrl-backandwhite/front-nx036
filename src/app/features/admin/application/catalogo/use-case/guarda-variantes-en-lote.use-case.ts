import { Injectable, inject } from '@angular/core';
import { AppError } from '@shared/error/app-error';
import { Result, exito } from '@shared/result/result';
import {
  BorradorDeVariante,
  VarianteDeProducto,
  desdeBorrador,
  variantesCambiadas,
} from '../../../domain/catalogo/model/variante-de-producto';
import { VARIANTES_PORT } from '../../../domain/catalogo/port/ficha-de-producto.port';

/**
 * Guarda de una vez todas las variantes que se hayan tocado.
 *
 * <p>Solo viajan las CAMBIADAS: en una ficha con treinta variantes, mandarlas todas serían treinta
 * peticiones para un cambio de una, y cada una puede fallar por su cuenta. Devuelve cuántas se
 * guardaron para poder decirlo.
 */
@Injectable()
export class GuardaVariantesEnLote {
  private readonly variantes = inject(VARIANTES_PORT);

  async ejecuta(
    actuales: readonly VarianteDeProducto[],
    borradores: Readonly<Record<string, BorradorDeVariante>>,
  ): Promise<Result<number, AppError>> {
    const cambiadas = variantesCambiadas(actuales, borradores);
    for (const variante of cambiadas) {
      const resultado = await this.variantes.actualiza(
        variante.id,
        desdeBorrador(borradores[variante.id]),
      );
      if (!resultado.ok) {
        return resultado;
      }
    }
    return exito(cambiadas.length);
  }
}
