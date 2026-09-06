import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { ClaseDeDocumento, DocumentoLegal } from '../model/legal';

/**
 * Los textos legales.
 *
 * <p>`guarda` y `publica` son métodos DISTINTOS a propósito: guardar deja un borrador que no ve nadie;
 * publicar hace visible el texto y manda un correo a todas las cuentas activas. Juntarlos en un
 * `guarda(publicando: boolean)` habría hecho que ese parámetro se pusiera a `true` por descuido.
 */
export interface LegalPort {
  lista(): Promise<Result<readonly DocumentoLegal[], AppError>>;
  documento(clase: ClaseDeDocumento, idioma: string): Promise<Result<DocumentoLegal, AppError>>;
  guarda(
    clase: ClaseDeDocumento,
    idioma: string,
    titulo: string,
    cuerpo: string,
  ): Promise<Result<void, AppError>>;
  /** Publica TODOS los documentos con esa versión. Devuelve a cuántas cuentas se avisó. */
  publica(version: string): Promise<Result<{ version: string; avisados: number }, AppError>>;
}

export const LEGAL_PORT = new InjectionToken<LegalPort>('LegalPort');
