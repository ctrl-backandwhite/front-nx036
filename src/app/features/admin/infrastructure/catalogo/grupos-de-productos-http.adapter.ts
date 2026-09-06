import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { AppError } from '@shared/error/app-error';
import { Result, mapea } from '@shared/result/result';
import {
  BorradorDeGrupo,
  GrupoDeProductos,
  MiembroDeGrupo,
} from '../../domain/catalogo/model/grupo-de-productos';
import { GruposDeProductosPort } from '../../domain/catalogo/port/grupos-de-productos.port';

interface GrupoDto {
  id: string;
  name: string;
  description?: string;
  active?: boolean;
  memberCount?: number;
}

export function aGrupo(dto: GrupoDto): GrupoDeProductos {
  return {
    id: dto.id,
    nombre: dto.name,
    descripcion: dto.description,
    activo: dto.active !== false,
    numeroDeMiembros: dto.memberCount ?? 0,
  };
}

export function aMiembro(dto: { id: string; title: string; slug?: string }): MiembroDeGrupo {
  return { id: dto.id, titulo: dto.title, slug: dto.slug ?? '' };
}

/** Los grupos de productos contra nuestro backend. Se registra en `catalogo.providers.ts`. */
@Injectable()
export class GruposDeProductosHttpAdapter implements GruposDeProductosPort {
  private readonly api = inject(ApiService);

  async lista(): Promise<Result<readonly GrupoDeProductos[], AppError>> {
    const respuesta = await this.api.get<GrupoDto[]>('/admin/product-groups');
    return mapea(respuesta, (lista) => (lista ?? []).map(aGrupo));
  }

  async crea(borrador: BorradorDeGrupo): Promise<Result<void, AppError>> {
    const respuesta = await this.api.post<unknown>('/admin/product-groups', {
      name: borrador.nombre,
      description: borrador.descripcion,
      active: borrador.activo,
    });
    return mapea(respuesta, () => undefined);
  }

  async actualiza(id: string, borrador: BorradorDeGrupo): Promise<Result<void, AppError>> {
    const respuesta = await this.api.put<unknown>(
      `/admin/product-groups/${encodeURIComponent(id)}`,
      { name: borrador.nombre, description: borrador.descripcion, active: borrador.activo },
    );
    return mapea(respuesta, () => undefined);
  }

  async elimina(id: string): Promise<Result<void, AppError>> {
    const respuesta = await this.api.delete<unknown>(
      `/admin/product-groups/${encodeURIComponent(id)}`,
    );
    return mapea(respuesta, () => undefined);
  }
}
