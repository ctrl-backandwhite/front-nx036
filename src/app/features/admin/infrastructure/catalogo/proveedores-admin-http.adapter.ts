import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { AppError } from '@shared/error/app-error';
import { Result, mapea } from '@shared/result/result';
import {
  CambiosDeProveedor,
  CriterioDeProveedores,
  PaginaDeProveedores,
  ProveedorAdmin,
} from '../../domain/catalogo/model/proveedor-admin';
import { ResultadoMasivo } from '../../domain/catalogo/model/resultado-masivo';
import {
  ProveedoresAdminPort,
  ProveedoresMasivosPort,
} from '../../domain/catalogo/port/proveedores-admin.port';

interface ProveedorDto {
  id: string;
  externalId?: string;
  source?: string;
  name: string;
  nameZh?: string;
  country?: string;
  city?: string;
  rating?: number;
  yearsActive?: number;
  verified?: boolean;
  trustPass?: boolean;
  profileUrl?: string;
  productCount?: number;
  description?: string;
  leadTimeDays?: number;
  onTimePct?: number;
  defectRate?: number;
  responseHours?: number;
}

interface ResultadoMasivoDto {
  succeeded?: number;
  failed: number;
  errors?: string[];
}

function aProveedor(dto: ProveedorDto): ProveedorAdmin {
  return {
    id: dto.id,
    idExterno: dto.externalId ?? '',
    origen: dto.source ?? '',
    nombre: dto.name,
    nombreZh: dto.nameZh,
    pais: dto.country,
    ciudad: dto.city,
    valoracion: dto.rating,
    anosActivo: dto.yearsActive,
    verificado: !!dto.verified,
    trustPass: !!dto.trustPass,
    urlPerfil: dto.profileUrl,
    numeroDeProductos: dto.productCount ?? 0,
    descripcion: dto.description,
    plazoDeEntregaDias: dto.leadTimeDays,
    puntualidadPorcentaje: dto.onTimePct,
    tasaDeDefectos: dto.defectRate,
    horasDeRespuesta: dto.responseHours,
  };
}

function aCuerpo(cambios: CambiosDeProveedor): Record<string, unknown> {
  return {
    name: cambios.nombre,
    nameZh: cambios.nombreZh,
    country: cambios.pais,
    city: cambios.ciudad,
    rating: cambios.valoracion,
    yearsActive: cambios.anosActivo,
    verified: cambios.verificado,
    trustPass: cambios.trustPass,
    profileUrl: cambios.urlPerfil,
  };
}

function aResultadoMasivo(dto: ResultadoMasivoDto): ResultadoMasivo {
  return { correctos: dto.succeeded ?? 0, fallidos: dto.failed ?? 0, errores: dto.errors ?? [] };
}

/** Los proveedores del panel contra nuestro backend. Se registra en `catalogo.providers.ts`. */
@Injectable()
export class ProveedoresAdminHttpAdapter
  implements ProveedoresAdminPort, ProveedoresMasivosPort
{
  private readonly api = inject(ApiService);

  async lista(criterio: CriterioDeProveedores): Promise<Result<PaginaDeProveedores, AppError>> {
    const respuesta = await this.api.get<{
      items: ProveedorDto[];
      totalElements: number;
      totalPages: number;
    }>('/admin/catalog/suppliers', {
      q: criterio.texto || undefined,
      country: criterio.pais || undefined,
      verified: criterio.verificado,
      page: criterio.pagina,
      size: criterio.tamano,
    });
    return mapea(respuesta, (pagina) => ({
      proveedores: (pagina.items ?? []).map(aProveedor),
      total: pagina.totalElements ?? 0,
      paginas: pagina.totalPages ?? 1,
    }));
  }

  async crea(cambios: CambiosDeProveedor): Promise<Result<void, AppError>> {
    const respuesta = await this.api.post<unknown>(
      '/admin/catalog/suppliers/create',
      aCuerpo(cambios),
    );
    return mapea(respuesta, () => undefined);
  }

  async actualiza(id: string, cambios: CambiosDeProveedor): Promise<Result<void, AppError>> {
    const respuesta = await this.api.put<unknown>(
      `/admin/catalog/suppliers/${encodeURIComponent(id)}`,
      aCuerpo(cambios),
    );
    return mapea(respuesta, () => undefined);
  }

  async elimina(id: string): Promise<Result<void, AppError>> {
    const respuesta = await this.api.delete<unknown>(
      `/admin/catalog/suppliers/${encodeURIComponent(id)}`,
    );
    return mapea(respuesta, () => undefined);
  }

  async alternaVerificado(id: string): Promise<Result<void, AppError>> {
    const respuesta = await this.api.post<unknown>(
      `/admin/catalog/suppliers/${encodeURIComponent(id)}/verify`,
    );
    return mapea(respuesta, () => undefined);
  }

  async reindexa(): Promise<Result<number, AppError>> {
    const respuesta = await this.api.post<{ indexed: number }>(
      '/admin/catalog/suppliers/reindex',
    );
    return mapea(respuesta, (cuerpo) => cuerpo.indexed ?? 0);
  }

  async verifica(
    ids: readonly string[],
    verificado: boolean,
  ): Promise<Result<ResultadoMasivo, AppError>> {
    const respuesta = await this.api.put<ResultadoMasivoDto>(
      '/admin/catalog/suppliers/bulk-verify',
      { ids, verified: verificado },
    );
    return mapea(respuesta, aResultadoMasivo);
  }

  async eliminaEnLote(ids: readonly string[]): Promise<Result<ResultadoMasivo, AppError>> {
    const respuesta = await this.api.post<ResultadoMasivoDto>(
      '/admin/catalog/suppliers/bulk-delete',
      ids,
    );
    return mapea(respuesta, aResultadoMasivo);
  }
}
