import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { AppError } from '@shared/error/app-error';
import { Result, mapea } from '@shared/result/result';
import { MiembroDeGrupo } from '../../domain/catalogo/model/grupo-de-productos';
import { MiembrosDeGrupoPort } from '../../domain/catalogo/port/grupos-de-productos.port';
import { aMiembro } from './grupos-de-productos-http.adapter';

/** Cuántos productos se ofrecen al buscar a quién meter en un grupo. */
const CANDIDATOS_POR_BUSQUEDA = 20;

/**
 * Los miembros de un grupo contra nuestro backend.
 *
 * <p>La búsqueda de candidatos va contra el listado del ESCAPARATE y no contra el del panel: es el
 * mismo motor de búsqueda, y así lo que se encuentra aquí es lo que de verdad está publicado.
 */
@Injectable()
export class MiembrosDeGrupoHttpAdapter implements MiembrosDeGrupoPort {
  private readonly api = inject(ApiService);

  async lista(grupoId: string): Promise<Result<readonly MiembroDeGrupo[], AppError>> {
    const respuesta = await this.api.get<{ id: string; title: string; slug: string }[]>(
      `/admin/product-groups/${encodeURIComponent(grupoId)}/members`,
    );
    return mapea(respuesta, (lista) => (lista ?? []).map(aMiembro));
  }

  async anade(grupoId: string, productoIds: readonly string[]): Promise<Result<number, AppError>> {
    const respuesta = await this.api.post<{ added: number }>(
      `/admin/product-groups/${encodeURIComponent(grupoId)}/members`,
      { productIds: productoIds },
    );
    return mapea(respuesta, (cuerpo) => cuerpo.added ?? 0);
  }

  async quita(grupoId: string, productoId: string): Promise<Result<void, AppError>> {
    const respuesta = await this.api.delete<unknown>(
      `/admin/product-groups/${encodeURIComponent(grupoId)}/members/${encodeURIComponent(productoId)}`,
    );
    return mapea(respuesta, () => undefined);
  }

  async busca(texto: string): Promise<Result<readonly MiembroDeGrupo[], AppError>> {
    const respuesta = await this.api.get<{ items: { id: string; title: string; slug: string }[] }>(
      '/catalog/products',
      { page: 0, size: CANDIDATOS_POR_BUSQUEDA, lang: 'es', q: texto || undefined },
    );
    return mapea(respuesta, (pagina) => (pagina.items ?? []).map(aMiembro));
  }
}
