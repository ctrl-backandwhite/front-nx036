import { Injectable, inject } from '@angular/core';
import { AppError } from '@shared/error/app-error';
import { Result } from '@shared/result/result';
import { IMAGENES_DE_PRODUCTO_PORT } from '../../../domain/catalogo/port/ficha-de-producto.port';

/**
 * Guarda el orden de la galería.
 *
 * <p>El PRIMERO pasa a ser la imagen principal, así que reordenar no es cosmética: cambia la foto con
 * la que el producto sale en el escaparate y en los correos.
 */
@Injectable()
export class ReordenaImagenes {
  private readonly imagenes = inject(IMAGENES_DE_PRODUCTO_PORT);

  ejecuta(productoId: string, imagenIds: readonly string[]): Promise<Result<void, AppError>> {
    return this.imagenes.reordena(productoId, imagenIds);
  }
}
