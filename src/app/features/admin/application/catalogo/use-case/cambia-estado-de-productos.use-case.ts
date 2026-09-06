import { Injectable, inject } from '@angular/core';
import { AppError } from '@shared/error/app-error';
import { Result, exito } from '@shared/result/result';
import { EstadoDeProducto } from '../../../domain/catalogo/model/producto-admin';
import { ResultadoMasivo } from '../../../domain/catalogo/model/resultado-masivo';
import {
  PRODUCTOS_ADMIN_PORT,
  PRODUCTOS_MASIVOS_PORT,
} from '../../../domain/catalogo/port/productos-admin.port';

/**
 * Publica, pausa o archiva productos.
 *
 * <p>Uno o muchos: con un solo identificador va por la ruta de uno —que devuelve el error de aduana
 * redactado— y con varios por la de lote, que itera y reporta por identificador. El backend NIEGA la
 * publicación de un producto al que le falten los datos obligatorios de aduana y dice cuáles son; ese
 * mensaje tiene que llegar a la pantalla, porque si no el botón parece no hacer nada y el producto se
 * queda en borrador sin explicación.
 */
@Injectable()
export class CambiaEstadoDeProductos {
  private readonly productos = inject(PRODUCTOS_ADMIN_PORT);
  private readonly masivos = inject(PRODUCTOS_MASIVOS_PORT);

  async ejecuta(
    ids: readonly string[],
    estado: EstadoDeProducto,
  ): Promise<Result<ResultadoMasivo, AppError>> {
    if (ids.length === 0) {
      return exito({ correctos: 0, fallidos: 0, errores: [] });
    }
    if (ids.length === 1) {
      const resultado = await this.productos.cambiaEstado(ids[0], estado);
      return resultado.ok ? exito({ correctos: 1, fallidos: 0, errores: [] }) : resultado;
    }
    return this.masivos.cambiaEstados(ids, estado);
  }
}
