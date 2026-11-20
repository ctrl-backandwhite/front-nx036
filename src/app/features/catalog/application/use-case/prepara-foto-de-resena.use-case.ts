import { Injectable, inject } from '@angular/core';
import { Result, fallo } from '@shared/result/result';
import { AppError, creaError } from '@shared/error/app-error';
import { REDUCTOR_DE_FOTOS_PORT } from '../../domain/port/reductor-de-fotos.port';
import {
  FOTO_TIPO_NO_ADMITIDO,
  esFotoAdmitida,
  validaPesoDeFoto,
} from '../../domain/model/fotos-de-resena';

/**
 * Deja una foto lista para adjuntarla a una reseña: comprueba el tipo, la reduce en el navegador y
 * comprueba que, ya reducida, cabe. El tope de 5 MB se mira DESPUÉS de reducir: una foto de móvil de
 * 8 MB suele quedar en unos cientos de kB y no hay motivo para rechazarla.
 */
@Injectable()
export class PreparaFotoDeResena {
  private readonly reductor = inject(REDUCTOR_DE_FOTOS_PORT);

  async ejecuta(fichero: File): Promise<Result<File, AppError>> {
    if (!esFotoAdmitida(fichero)) {
      return fallo(creaError('peticion-invalida', '', { codigo: FOTO_TIPO_NO_ADMITIDO }));
    }
    return validaPesoDeFoto(await this.reductor.reduce(fichero));
  }
}
