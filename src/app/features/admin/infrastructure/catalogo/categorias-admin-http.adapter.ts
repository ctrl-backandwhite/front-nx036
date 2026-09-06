import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { AppError } from '@shared/error/app-error';
import { Result, mapea } from '@shared/result/result';
import {
  BorradorDeCategoria,
  CategoriaAdmin,
  CriterioDeCategorias,
  PaginaDeCategorias,
} from '../../domain/catalogo/model/categoria-admin';
import {
  ArbolDeCategoriasPort,
  CategoriaParaElegir,
  CategoriasAdminPort,
} from '../../domain/catalogo/port/categorias-admin.port';

interface CategoriaDto {
  id: string;
  slug: string;
  nameZh?: string;
  names?: Record<string, string>;
  icon?: string;
  position?: number;
  active?: boolean;
  parentId?: string | null;
  productCount?: number;
}

interface NodoDto {
  id: string;
  name: string;
  children?: NodoDto[];
}

function aCategoria(dto: CategoriaDto): CategoriaAdmin {
  return {
    id: dto.id,
    slug: dto.slug,
    nombreZh: dto.nameZh ?? '',
    nombres: dto.names ?? {},
    icono: dto.icon,
    posicion: dto.position ?? 0,
    activa: dto.active !== false,
    padreId: dto.parentId ?? null,
    numeroDeProductos: dto.productCount ?? 0,
  };
}

/**
 * El alta espera el contrato de ingesta (`IngestCategoryRequest`), que llama `nameTranslations` a lo
 * que la edición llama `names`. Traducirlo aquí evita que esa incoherencia del backend suba al dominio.
 */
function aCuerpo(borrador: BorradorDeCategoria): Record<string, unknown> {
  return {
    slug: borrador.slug,
    // El chino cae al español cuando no se rellena: el backend lo usa como nombre canónico.
    nameZh: borrador.nombreZh || borrador.nombreEs,
    names: {
      en: borrador.nombreEn,
      es: borrador.nombreEs,
      pt: borrador.nombrePt || undefined,
    },
    nameTranslations: {
      en: borrador.nombreEn,
      es: borrador.nombreEs,
      pt: borrador.nombrePt || undefined,
    },
    parentId: borrador.padreId || null,
    position: 0,
  };
}

/** Aplana el árbol a «Padre › Hijo» para poder elegirlo en un desplegable, y lo ordena por esa ruta. */
function aplana(nodos: readonly NodoDto[], prefijo: string): CategoriaParaElegir[] {
  const salida: CategoriaParaElegir[] = [];
  for (const nodo of nodos) {
    const etiqueta = prefijo ? `${prefijo} › ${nodo.name}` : nodo.name;
    salida.push({ id: nodo.id, etiqueta });
    if (nodo.children?.length) {
      salida.push(...aplana(nodo.children, etiqueta));
    }
  }
  return salida;
}

/** Las categorías del panel contra nuestro backend. Se registra en `catalogo.providers.ts`. */
@Injectable()
export class CategoriasAdminHttpAdapter implements CategoriasAdminPort, ArbolDeCategoriasPort {
  private readonly api = inject(ApiService);

  async listaPaginada(criterio: CriterioDeCategorias): Promise<Result<PaginaDeCategorias, AppError>> {
    const respuesta = await this.api.get<{
      items: CategoriaDto[];
      totalElements: number;
      totalPages: number;
    }>('/admin/catalog/categories/paged', {
      q: criterio.texto || undefined,
      hasProducts: criterio.conProductos,
      page: criterio.pagina,
      size: criterio.tamano,
    });
    return mapea(respuesta, (pagina) => ({
      categorias: (pagina.items ?? []).map(aCategoria),
      total: pagina.totalElements ?? 0,
      paginas: pagina.totalPages ?? 1,
    }));
  }

  async listaTodas(): Promise<Result<readonly CategoriaAdmin[], AppError>> {
    const respuesta = await this.api.get<CategoriaDto[]>('/admin/catalog/categories');
    return mapea(respuesta, (lista) => (lista ?? []).map(aCategoria));
  }

  async crea(borrador: BorradorDeCategoria): Promise<Result<void, AppError>> {
    const respuesta = await this.api.post<unknown>('/admin/catalog/categories', aCuerpo(borrador));
    return mapea(respuesta, () => undefined);
  }

  async actualiza(id: string, borrador: BorradorDeCategoria): Promise<Result<void, AppError>> {
    const respuesta = await this.api.put<unknown>(
      `/admin/catalog/categories/${encodeURIComponent(id)}`,
      aCuerpo(borrador),
    );
    return mapea(respuesta, () => undefined);
  }

  async elimina(id: string): Promise<Result<void, AppError>> {
    const respuesta = await this.api.delete<unknown>(
      `/admin/catalog/categories/${encodeURIComponent(id)}`,
    );
    return mapea(respuesta, () => undefined);
  }

  async alterna(id: string): Promise<Result<void, AppError>> {
    const respuesta = await this.api.put<unknown>(
      `/admin/catalog/categories/${encodeURIComponent(id)}/toggle`,
    );
    return mapea(respuesta, () => undefined);
  }

  async activaEnLote(ids: readonly string[], activa: boolean): Promise<Result<number, AppError>> {
    const respuesta = await this.api.put<{ updated: number }>(
      '/admin/catalog/categories/bulk-active',
      { ids, active: activa },
    );
    return mapea(respuesta, (cuerpo) => cuerpo.updated ?? 0);
  }

  async reindexa(): Promise<Result<number, AppError>> {
    const respuesta = await this.api.post<{ indexed: number }>(
      '/admin/catalog/categories/reindex',
    );
    return mapea(respuesta, (cuerpo) => cuerpo.indexed ?? 0);
  }

  async consulta(idioma: string): Promise<Result<readonly CategoriaParaElegir[], AppError>> {
    const respuesta = await this.api.get<NodoDto[]>('/catalog/categories/tree', { lang: idioma });
    return mapea(respuesta, (arbol) =>
      aplana(arbol ?? [], '').sort((a, b) => a.etiqueta.localeCompare(b.etiqueta)),
    );
  }
}
