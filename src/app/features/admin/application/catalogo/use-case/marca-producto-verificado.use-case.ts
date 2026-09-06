import { Injectable, inject } from '@angular/core';
import { AppError } from '@shared/error/app-error';
import { Result } from '@shared/result/result';
import { PRODUCTOS_ADMIN_PORT } from '../../../domain/catalogo/port/productos-admin.port';

/**
 * Marca o desmarca la certificación manual de un producto.
 *
 * <p>Certificar dispara además el anuncio al bus del catálogo, que va DIFERIDO: por eso la respuesta es
 * inmediata y un fallo del anuncio no llega aquí, sino a la lista de anuncios perdidos.
 */
@Injectable()
export class MarcaProductoVerificado {
  private readonly productos = inject(PRODUCTOS_ADMIN_PORT);

  ejecuta(id: string, verificado: boolean, idioma: string): Promise<Result<void, AppError>> {
    return this.productos.marcaVerificado(id, verificado, idioma);
  }
}
