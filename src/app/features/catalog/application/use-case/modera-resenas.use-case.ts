import { Injectable, inject } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { MODERACION_DE_RESENAS_PORT } from '../../domain/port/moderacion-de-resenas.port';

/** Ocultar una reseña o quitar una de sus fotos. Solo se ofrece a quien administra. */
@Injectable()
export class ModeraResenas {
  private readonly puerto = inject(MODERACION_DE_RESENAS_PORT);

  ocultaResena(idDeResena: string): Promise<Result<void, AppError>> {
    return this.puerto.ocultaResena(idDeResena);
  }

  quitaFoto(idDeResena: string, idDeFoto: string): Promise<Result<void, AppError>> {
    return this.puerto.quitaFoto(idDeResena, idDeFoto);
  }
}
