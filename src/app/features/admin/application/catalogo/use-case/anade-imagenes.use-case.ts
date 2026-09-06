import { Injectable, inject } from '@angular/core';
import { AppError } from '@shared/error/app-error';
import { Result, exito } from '@shared/result/result';
import { IMAGENES_DE_PRODUCTO_PORT } from '../../../domain/catalogo/port/ficha-de-producto.port';

/** Cuántas entraron y cuáles no, para poder decirlo sin perder las que sí. */
export interface AltaDeImagenes {
  readonly anadidas: number;
  readonly fallidas: readonly string[];
}

/**
 * Añade imágenes a la galería por dirección.
 *
 * <p>Van EN SECUENCIA y no en paralelo porque el orden de llegada es el orden de la galería, y la
 * primera pasa a ser la principal. Un fallo parcial no aborta el resto: se informa de cuáles no
 * entraron y las demás se quedan.
 */
@Injectable()
export class AnadeImagenes {
  private readonly imagenes = inject(IMAGENES_DE_PRODUCTO_PORT);

  async ejecuta(
    productoId: string,
    direcciones: readonly string[],
  ): Promise<Result<AltaDeImagenes, AppError>> {
    let anadidas = 0;
    const fallidas: string[] = [];
    for (const direccion of direcciones) {
      const resultado = await this.imagenes.anade(productoId, direccion);
      if (resultado.ok) {
        anadidas++;
      } else {
        fallidas.push(direccion);
      }
    }
    return exito({ anadidas, fallidas });
  }
}
