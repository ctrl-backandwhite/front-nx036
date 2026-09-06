import { Injectable, inject } from '@angular/core';
import { AppError } from '@shared/error/app-error';
import { Result } from '@shared/result/result';
import { VARIANTES_PORT } from '../../../domain/catalogo/port/ficha-de-producto.port';

/** Borra una variante. No toca el valor de variación: ese se borra desde la pestaña de precios. */
@Injectable()
export class EliminaVariante {
  private readonly variantes = inject(VARIANTES_PORT);

  ejecuta(id: string): Promise<Result<void, AppError>> {
    return this.variantes.elimina(id);
  }
}
