import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { ClaseDeDocumento, DocumentoLegal } from '../../domain/gestion/model/legal';
import { LegalPort } from '../../domain/gestion/port/legal.port';
import { sinCuerpo } from './sin-cuerpo';

interface DocumentoDto {
  docType: string;
  lang: string;
  title?: string;
  body?: string;
  version?: string;
  published?: boolean;
  hasDraft?: boolean;
  draftTitle?: string | null;
  draftBody?: string | null;
}

function aDocumento(dto: DocumentoDto): DocumentoLegal {
  return {
    clase: dto.docType as ClaseDeDocumento,
    idioma: dto.lang,
    titulo: dto.title ?? '',
    cuerpo: dto.body ?? '',
    version: dto.version ?? '',
    publicado: dto.published ?? false,
    tieneBorrador: dto.hasDraft ?? false,
    tituloBorrador: dto.draftTitle ?? null,
    cuerpoBorrador: dto.draftBody ?? null,
  };
}

@Injectable()
export class LegalHttpAdapter implements LegalPort {
  private readonly api = inject(ApiService);

  async lista(): Promise<Result<readonly DocumentoLegal[], AppError>> {
    const respuesta = await this.api.get<DocumentoDto[]>('/admin/legal');
    return mapea(respuesta, (lista) => (lista ?? []).map(aDocumento));
  }

  async documento(
    clase: ClaseDeDocumento,
    idioma: string,
  ): Promise<Result<DocumentoLegal, AppError>> {
    const respuesta = await this.api.get<DocumentoDto>(`/admin/legal/${clase}/${idioma}`);
    return mapea(respuesta, aDocumento);
  }

  /** Guarda el BORRADOR. No publica nada ni avisa a nadie. */
  guarda(
    clase: ClaseDeDocumento,
    idioma: string,
    titulo: string,
    cuerpo: string,
  ): Promise<Result<void, AppError>> {
    return sinCuerpo(this.api.put(`/admin/legal/${clase}/${idioma}`, { title: titulo, body: cuerpo }));
  }

  /** Publica TODOS los documentos con esa versión y manda un correo a las cuentas activas. */
  async publica(version: string): Promise<Result<{ version: string; avisados: number }, AppError>> {
    const respuesta = await this.api.post<{ version?: string; notified?: number }>(
      '/admin/legal/publish',
      { version },
    );
    return mapea(respuesta, (dto) => ({
      version: dto?.version ?? version,
      avisados: dto?.notified ?? 0,
    }));
  }
}
