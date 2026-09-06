import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { Almacen, DatosDeAlmacen } from '../../domain/logistica/model/almacen';
import { AlmacenesAdminPort } from '../../domain/logistica/port/configuracion-logistica.port';

interface AlmacenDto {
  id: string;
  code: string;
  name: string;
  country?: string;
  city?: string;
  active?: boolean;
}

function aAlmacen(dto: AlmacenDto): Almacen {
  return {
    id: dto.id,
    codigo: dto.code,
    nombre: dto.name,
    pais: dto.country,
    ciudad: dto.city,
    activo: dto.active !== false,
  };
}

function aDto(datos: DatosDeAlmacen): Record<string, unknown> {
  return {
    code: datos.codigo,
    name: datos.nombre,
    country: datos.pais,
    city: datos.ciudad,
    active: datos.activo,
  };
}

/** Los almacenes de la red, contra nuestro backend. */
@Injectable()
export class AlmacenesHttpAdapter implements AlmacenesAdminPort {
  private readonly api = inject(ApiService);

  async lista(): Promise<Result<readonly Almacen[], AppError>> {
    const respuesta = await this.api.get<AlmacenDto[]>('/admin/warehouses');
    return mapea(respuesta, (filas) => (filas ?? []).map(aAlmacen));
  }

  async crea(datos: DatosDeAlmacen): Promise<Result<void, AppError>> {
    return mapea(await this.api.post<unknown>('/admin/warehouses', aDto(datos)), () => undefined);
  }

  async actualiza(id: string, datos: DatosDeAlmacen): Promise<Result<void, AppError>> {
    return mapea(await this.api.put<unknown>(`/admin/warehouses/${id}`, aDto(datos)), () => undefined);
  }

  async borra(id: string): Promise<Result<void, AppError>> {
    return mapea(await this.api.delete<unknown>(`/admin/warehouses/${id}`), () => undefined);
  }
}
