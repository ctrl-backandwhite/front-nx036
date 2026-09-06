import { Injectable, inject } from '@angular/core';
import { AppError } from '@shared/error/app-error';
import { Result, exito } from '@shared/result/result';
import { IMAGENES_DE_PRODUCTO_PORT } from '../../../domain/catalogo/port/ficha-de-producto.port';

/** Cuántas se borraron y cuántas no: un borrado a medias tiene que poder decirse. */
export interface BajaDeImagenes {
  readonly borradas: number;
  readonly fallidas: number;
}

/** Borra una o varias imágenes de la galería, sin que un fallo se lleve por delante a las demás. */
@Injectable()
export class EliminaImagenes {
  private readonly imagenes = inject(IMAGENES_DE_PRODUCTO_PORT);

  async ejecuta(imagenIds: readonly string[]): Promise<Result<BajaDeImagenes, AppError>> {
    let borradas = 0;
    let fallidas = 0;
    for (const id of imagenIds) {
      const resultado = await this.imagenes.elimina(id);
      if (resultado.ok) {
        borradas++;
      } else {
        fallidas++;
      }
    }
    return exito({ borradas, fallidas });
  }
}
