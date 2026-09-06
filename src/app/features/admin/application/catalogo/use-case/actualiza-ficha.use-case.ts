import { Injectable, inject } from '@angular/core';
import { AppError } from '@shared/error/app-error';
import { Result } from '@shared/result/result';
import { CambiosDeFicha } from '../../../domain/catalogo/model/ficha-de-producto';
import { FICHA_DE_PRODUCTO_PORT } from '../../../domain/catalogo/port/ficha-de-producto.port';

/**
 * Guarda un cambio parcial de la ficha.
 *
 * <p>Es UNA sola operación para la edición rápida, el SEO, la descripción y los tres importes en
 * yuanes: todos son el mismo guardado parcial y por idioma, y tener cuatro casos de uso idénticos solo
 * repartiría el mismo error por cuatro sitios.
 */
@Injectable()
export class ActualizaFicha {
  private readonly ficha = inject(FICHA_DE_PRODUCTO_PORT);

  ejecuta(id: string, cambios: CambiosDeFicha, idioma: string): Promise<Result<void, AppError>> {
    return this.ficha.actualiza(id, cambios, idioma);
  }
}
