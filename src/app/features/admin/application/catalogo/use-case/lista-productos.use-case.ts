import { Injectable, inject } from '@angular/core';
import { AppError } from '@shared/error/app-error';
import { Result } from '@shared/result/result';
import { CriterioDeCatalogo, PaginaDeProductos } from '../../../domain/catalogo/model/producto-admin';
import { PRODUCTOS_ADMIN_PORT } from '../../../domain/catalogo/port/productos-admin.port';

/**
 * Trae una página del catálogo.
 *
 * <p>El ESTADO, la CATEGORÍA y el texto libre los resuelve el servidor, no el navegador: así el recuento
 * y la paginación son los del catálogo entero y en todos los idiomas. Filtrar por trozo de texto sobre
 * la página cargada se dejaba fuera las coincidencias de las demás páginas y de los demás idiomas.
 */
@Injectable()
export class ListaProductos {
  private readonly productos = inject(PRODUCTOS_ADMIN_PORT);

  ejecuta(criterio: CriterioDeCatalogo): Promise<Result<PaginaDeProductos, AppError>> {
    return this.productos.lista(criterio);
  }
}
