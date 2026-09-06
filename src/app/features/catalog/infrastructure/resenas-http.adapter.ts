import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { ResenaNueva, ResenasPort } from '../domain/port/resenas.port';
import { ResumenDeResenas } from '../domain/model/catalogo-auxiliar';

interface ResenaDto {
  id: string;
  authorName?: string;
  rating: number;
  title?: string;
  body?: string;
  source?: 'SUPPLIER' | 'CUSTOMER';
  language?: string;
  createdAt?: string;
}

interface ListaDeResenasDto {
  items?: ResenaDto[];
  totalElements?: number;
  distribution?: Record<string, number>;
  averageRating?: number;
}

@Injectable()
export class ResenasHttpAdapter implements ResenasPort {
  private readonly api = inject(ApiService);

  async lista(
    idDelProducto: string,
    pagina: number,
    tamano: number,
  ): Promise<Result<ResumenDeResenas, AppError>> {
    const respuesta = await this.api.get<ListaDeResenasDto>(
      `/catalog/products/${idDelProducto}/reviews`,
      { page: pagina, size: tamano },
    );
    return mapea(respuesta, (dto) => ({
      items: (dto.items ?? []).map((r) => ({
        id: r.id,
        autor: r.authorName,
        valoracion: r.rating,
        titulo: r.title,
        cuerpo: r.body,
        origen: r.source,
        idioma: r.language,
        fecha: r.createdAt,
      })),
      total: dto.totalElements ?? 0,
      media: dto.averageRating ?? 0,
      reparto: dto.distribution ?? {},
    }));
  }

  async publica(idDelProducto: string, resena: ResenaNueva): Promise<Result<void, AppError>> {
    const respuesta = await this.api.post<ResenaDto>(
      `/catalog/products/${idDelProducto}/reviews`,
      {
        rating: resena.valoracion,
        title: resena.titulo || undefined,
        body: resena.cuerpo || undefined,
        language: resena.idioma,
        authorName: resena.autor || undefined,
      },
    );
    return mapea(respuesta, () => undefined);
  }
}
