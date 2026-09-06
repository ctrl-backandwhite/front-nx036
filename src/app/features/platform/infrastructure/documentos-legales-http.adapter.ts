import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { DocumentoLegalPublicado, TipoDeDocumentoLegal } from '../domain/model/documento-legal';
import { DocumentosLegalesPort } from '../domain/port/documentos-legales.port';

interface DocumentoDto {
  docType: TipoDeDocumentoLegal;
  lang: string;
  title: string;
  body: string;
  version: string;
}

/**
 * El documento legal publicado.
 *
 * <p>Solo la superficie PÚBLICA. El editor del panel —listar, borrador, guardar, publicar— vive en el
 * contexto de administración: son cuatro endpoints más de `api/legal.ts` que no tienen nada que hacer
 * en la página que lee alguien que acaba de llegar.
 */
@Injectable()
export class DocumentosLegalesHttpAdapter implements DocumentosLegalesPort {
  private readonly api = inject(ApiService);

  async consulta(
    tipo: TipoDeDocumentoLegal,
    idioma: string,
  ): Promise<Result<DocumentoLegalPublicado, AppError>> {
    // El backend cae al español si el documento no existe en el idioma pedido: eso lo decide él, que es
    // quien sabe cuáles están publicados y con qué versión.
    const respuesta = await this.api.get<DocumentoDto>(`/legal/${tipo}`, { lang: idioma });
    return mapea(respuesta, (dto) => ({
      tipo: dto.docType ?? tipo,
      idioma: dto.lang ?? idioma,
      titulo: dto.title,
      cuerpo: dto.body,
      version: dto.version,
    }));
  }
}
