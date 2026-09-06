import { Injectable, inject } from '@angular/core';
import { AppError } from '@shared/error/app-error';
import { Result, exito } from '@shared/result/result';
import { ResultadoMasivo } from '../../../domain/catalogo/model/resultado-masivo';
import {
  PRODUCTOS_ADMIN_PORT,
  PRODUCTOS_MASIVOS_PORT,
} from '../../../domain/catalogo/port/productos-admin.port';

/**
 * Borra productos.
 *
 * <p>El backend rechaza POR IDENTIFICADOR los que tengan pedidos, así que un lote puede salir a medias.
 * Devolver el recuento y los motivos es lo que impide dar por borrados decenas de productos que siguen
 * ahí.
 */
@Injectable()
export class EliminaProductos {
  private readonly productos = inject(PRODUCTOS_ADMIN_PORT);
  private readonly masivos = inject(PRODUCTOS_MASIVOS_PORT);

  async ejecuta(ids: readonly string[]): Promise<Result<ResultadoMasivo, AppError>> {
    if (ids.length === 0) {
      return exito({ correctos: 0, fallidos: 0, errores: [] });
    }
    if (ids.length === 1) {
      const resultado = await this.productos.elimina(ids[0]);
      return resultado.ok ? exito({ correctos: 1, fallidos: 0, errores: [] }) : resultado;
    }
    return this.masivos.eliminaEnLote(ids);
  }
}
