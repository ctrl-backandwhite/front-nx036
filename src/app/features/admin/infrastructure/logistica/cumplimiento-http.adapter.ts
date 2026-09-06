import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, exito, fallo, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import {
  EstadoDeCumplimiento,
  OperadorEconomico,
  PapelDeOperador,
} from '../../domain/logistica/model/cumplimiento';
import { CumplimientoPort } from '../../domain/logistica/port/configuracion-logistica.port';

interface OperadorDto {
  name?: string;
  addressLine?: string;
  postalCode?: string;
  city?: string;
  region?: string;
  country?: string;
  email?: string;
  phone?: string;
  role?: string;
  enabled?: boolean;
}

function aOperador(dto: OperadorDto): OperadorEconomico {
  return {
    nombre: dto.name ?? '',
    direccion: dto.addressLine ?? '',
    codigoPostal: dto.postalCode ?? '',
    ciudad: dto.city ?? '',
    provincia: dto.region ?? '',
    pais: dto.country ?? '',
    email: dto.email ?? '',
    telefono: dto.phone ?? '',
    papel: dto.role ?? 'IMPORTER',
    publicado: !!dto.enabled,
  };
}

function aDto(operador: OperadorEconomico): OperadorDto {
  return {
    name: operador.nombre,
    addressLine: operador.direccion,
    postalCode: operador.codigoPostal,
    city: operador.ciudad,
    region: operador.provincia,
    country: operador.pais,
    email: operador.email,
    phone: operador.telefono,
    role: operador.papel,
    enabled: operador.publicado,
  };
}

/**
 * El cumplimiento del Reglamento (UE) 2023/988, contra nuestro backend.
 *
 * <p>Esta superficie es la de ADMINISTRACIÓN: devuelve también los datos a medias, porque su trabajo es
 * precisamente enseñar qué falta. La pública, en cambio, solo devuelve el operador cuando es publicable.
 */
@Injectable()
export class CumplimientoHttpAdapter implements CumplimientoPort {
  private readonly api = inject(ApiService);

  async operador(idioma: string): Promise<Result<OperadorEconomico | null, AppError>> {
    // Cuando no hay ninguno declarado el backend responde sin cuerpo; se traduce a «no hay» en vez de
    // dejar escapar una cadena vacía disfrazada de objeto.
    const respuesta = await this.api.get<OperadorDto | ''>('/admin/compliance/responsible-person', {
      lang: idioma,
    });
    if (!respuesta.ok) {
      return fallo(respuesta.error);
    }
    return exito(respuesta.valor ? aOperador(respuesta.valor) : null);
  }

  async guardaOperador(
    operador: OperadorEconomico,
    idioma: string,
  ): Promise<Result<void, AppError>> {
    const respuesta = await this.api.put<unknown>(
      `/admin/compliance/responsible-person?lang=${encodeURIComponent(idioma)}`,
      aDto(operador),
    );
    return mapea(respuesta, () => undefined);
  }

  async papeles(idioma: string): Promise<Result<readonly PapelDeOperador[], AppError>> {
    const respuesta = await this.api.get<{ code: string; label: string }[]>(
      '/admin/compliance/operator-roles',
      { lang: idioma },
    );
    return mapea(respuesta, (filas) =>
      (filas ?? []).map((f) => ({ codigo: f.code, etiqueta: f.label })),
    );
  }

  async estado(idioma: string): Promise<Result<EstadoDeCumplimiento, AppError>> {
    const respuesta = await this.api.get<{
      responsiblePersonReady?: boolean;
      activeProducts?: number;
      missingManufacturer?: number;
    }>('/admin/compliance/status', { lang: idioma });
    return mapea(respuesta, (dto) => ({
      operadorPublicado: !!dto.responsiblePersonReady,
      productosActivos: dto.activeProducts ?? 0,
      sinFabricante: dto.missingManufacturer ?? 0,
    }));
  }
}
