import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { AppError } from '@shared/error/app-error';
import { Result, mapea } from '@shared/result/result';
import { GrupoDeDeclaracion } from '../../domain/catalogo/model/grupo-de-declaracion';
import { GruposDeDeclaracionPort } from '../../domain/catalogo/port/grupos-de-declaracion.port';

interface GrupoDto {
  id: string;
  hs6: string;
  material: string;
  usageCode: string;
  ename?: string;
  cname?: string;
  productCount?: number;
  approved?: boolean;
  approvedAt?: string;
  approvedBy?: string;
}

function aGrupo(dto: GrupoDto): GrupoDeDeclaracion {
  return {
    id: dto.id,
    hs6: dto.hs6,
    material: dto.material,
    codigoDeUso: dto.usageCode,
    nombreEn: dto.ename ?? '',
    nombreZh: dto.cname ?? '',
    numeroDeProductos: dto.productCount ?? 0,
    aprobado: !!dto.approved,
    aprobadoEl: dto.approvedAt,
    aprobadoPor: dto.approvedBy,
  };
}

/** Los grupos de declaración aduanera contra nuestro backend. */
@Injectable()
export class GruposDeDeclaracionHttpAdapter implements GruposDeDeclaracionPort {
  private readonly api = inject(ApiService);

  async lista(): Promise<Result<readonly GrupoDeDeclaracion[], AppError>> {
    const respuesta = await this.api.get<GrupoDto[]>('/admin/declaration-groups');
    return mapea(respuesta, (lista) => (lista ?? []).map(aGrupo));
  }

  async actualiza(id: string, nombreEn: string, nombreZh: string): Promise<Result<void, AppError>> {
    const respuesta = await this.api.put<unknown>(
      `/admin/declaration-groups/${encodeURIComponent(id)}`,
      { ename: nombreEn, cname: nombreZh },
    );
    return mapea(respuesta, () => undefined);
  }

  async aprueba(id: string): Promise<Result<void, AppError>> {
    const respuesta = await this.api.post<unknown>(
      `/admin/declaration-groups/${encodeURIComponent(id)}/approve`,
    );
    return mapea(respuesta, () => undefined);
  }

  async retiraAprobacion(id: string): Promise<Result<void, AppError>> {
    const respuesta = await this.api.post<unknown>(
      `/admin/declaration-groups/${encodeURIComponent(id)}/unapprove`,
    );
    return mapea(respuesta, () => undefined);
  }

  async siembra(): Promise<Result<number, AppError>> {
    const respuesta = await this.api.post<{ created: number }>('/admin/declaration-groups/sync');
    return mapea(respuesta, (cuerpo) => cuerpo.created ?? 0);
  }
}
