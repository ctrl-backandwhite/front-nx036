import { InjectionToken } from '@angular/core';
import { AppError } from '@shared/error/app-error';
import { Result } from '@shared/result/result';
import { GrupoDeDeclaracion } from '../model/grupo-de-declaracion';

/**
 * Los grupos de declaración aduanera.
 *
 * <p>`aprueba` es FIRMAR: fija con qué descripción se declaran ante veintisiete aduanas todos los
 * productos de la terna. Guardar el texto de uno ya aprobado lo devuelve a «sin revisar», y eso lo
 * decide el backend, no el panel.
 */
export interface GruposDeDeclaracionPort {
  lista(): Promise<Result<readonly GrupoDeDeclaracion[], AppError>>;
  actualiza(id: string, nombreEn: string, nombreZh: string): Promise<Result<void, AppError>>;
  aprueba(id: string): Promise<Result<void, AppError>>;
  retiraAprobacion(id: string): Promise<Result<void, AppError>>;
  /** Siembra los grupos que falten a partir del catálogo. Se lanza tras cada carga masiva. */
  siembra(): Promise<Result<number, AppError>>;
}

export const GRUPOS_DE_DECLARACION_PORT = new InjectionToken<GruposDeDeclaracionPort>(
  'GruposDeDeclaracionPort',
);
