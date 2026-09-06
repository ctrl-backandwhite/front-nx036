import { Injectable, inject } from '@angular/core';
import { AppError } from '@shared/error/app-error';
import { Result } from '@shared/result/result';
import { PRODUCTOS_ADMIN_PORT } from '../../../domain/catalogo/port/productos-admin.port';

/** Duplica un producto. La copia nace en borrador y con su propio identificador externo. */
@Injectable()
export class DuplicaProducto {
  private readonly productos = inject(PRODUCTOS_ADMIN_PORT);

  ejecuta(id: string, idioma?: string): Promise<Result<void, AppError>> {
    return this.productos.duplica(id, idioma);
  }
}
