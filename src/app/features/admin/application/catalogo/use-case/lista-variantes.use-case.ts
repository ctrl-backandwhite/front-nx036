import { Injectable, inject } from '@angular/core';
import { AppError } from '@shared/error/app-error';
import { Result } from '@shared/result/result';
import { VarianteDeProducto } from '../../../domain/catalogo/model/variante-de-producto';
import { VARIANTES_PORT } from '../../../domain/catalogo/port/ficha-de-producto.port';

/** Las variantes con su precio CRUDO —sin margen y en yuanes—, que es el que se edita. */
@Injectable()
export class ListaVariantes {
  private readonly variantes = inject(VARIANTES_PORT);

  ejecuta(productoId: string): Promise<Result<readonly VarianteDeProducto[], AppError>> {
    return this.variantes.lista(productoId);
  }
}
