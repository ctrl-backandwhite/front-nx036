import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { DocumentoLegalPublicado, TipoDeDocumentoLegal } from '../model/documento-legal';

/**
 * El documento legal PUBLICADO, en el idioma pedido.
 *
 * <p>Un solo método a propósito. `api/legal.ts` traía cinco endpoints, pero cuatro son del editor del
 * panel —listar, leer el borrador, guardarlo y publicar— y esos son del contexto `admin`, no de las
 * páginas públicas. Meterlos aquí habría hecho que la página de privacidad dependiera de un contrato
 * que solo usa el administrador, y que cualquier doble de prueba tuviera que fingir un editor entero
 * para pintar un texto.
 */
export interface DocumentosLegalesPort {
  consulta(
    tipo: TipoDeDocumentoLegal,
    idioma: string,
  ): Promise<Result<DocumentoLegalPublicado, AppError>>;
}

export const DOCUMENTOS_LEGALES_PORT = new InjectionToken<DocumentosLegalesPort>(
  'DocumentosLegalesPort',
);
