import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { BuscadorDeProductosPort } from '../../domain/logistica/port/pedidos-admin.port';

/** Cuántas sugerencias se piden. Las justas para elegir sin convertir el desplegable en un listado. */
const SUGERENCIAS = 20;

/**
 * Busca productos para montar una línea de un pedido nuevo.
 *
 * <p>Llama al MISMO endpoint del escaparate que usa el catálogo, pero devuelve solo dos campos. Es lo
 * que permite que el panel de pedidos no dependa del puerto grande del contexto de catálogo: cuando
 * aquel cambie su modelo de producto, aquí no se entera nadie.
 */
@Injectable()
export class BuscadorDeProductosHttpAdapter implements BuscadorDeProductosPort {
  private readonly api = inject(ApiService);

  async busca(
    texto: string,
    idioma: string,
  ): Promise<Result<readonly { readonly id: string; readonly titulo: string }[], AppError>> {
    const respuesta = await this.api.get<{ items?: { id: string; title?: string }[] }>(
      '/catalog/products',
      { page: 0, size: SUGERENCIAS, lang: idioma, q: texto },
    );
    return mapea(respuesta, (dto) =>
      (dto.items ?? []).map((p) => ({ id: p.id, titulo: p.title ?? '' })),
    );
  }
}
