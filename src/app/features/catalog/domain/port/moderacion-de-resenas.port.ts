import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';

/**
 * Moderación de reseñas desde la ficha, solo para quien administra.
 *
 * <p>Puerto aparte del de lectura y escritura de reseñas: quien compra no necesita conocerlo.
 */
export interface ModeracionDeResenasPort {
  ocultaResena(idDeResena: string): Promise<Result<void, AppError>>;
  quitaFoto(idDeResena: string, idDeFoto: string): Promise<Result<void, AppError>>;
}

export const MODERACION_DE_RESENAS_PORT = new InjectionToken<ModeracionDeResenasPort>(
  'ModeracionDeResenasPort',
);
