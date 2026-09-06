import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { DatosDeDireccion, Direccion, FormatoPostal } from '../domain/model/direccion';
import {
  AyudaDeDireccionPort,
  DireccionesPort,
  Provincia,
} from '../domain/port/direcciones.port';

interface DireccionDto {
  id: string;
  label?: string;
  fullName: string;
  phone?: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  default: boolean;
  createdAt: string;
}

interface ProvinciaDto {
  code: string;
  name: string;
}

interface FormatoPostalDto {
  countryCode: string;
  required: boolean;
  pattern: string;
  example: string;
}

/**
 * Traduce del vocabulario del backend al del dominio.
 *
 * <p>Es la razón de ser del adaptador: mientras exista, el día que el servidor renombre un campo se
 * cambia una línea aquí y no ciento y pico plantillas.
 */
function aDireccion(dto: DireccionDto): Direccion {
  return {
    id: dto.id,
    etiqueta: dto.label,
    nombreCompleto: dto.fullName,
    telefono: dto.phone,
    linea1: dto.line1,
    linea2: dto.line2,
    ciudad: dto.city,
    provincia: dto.state,
    codigoPostal: dto.postalCode,
    pais: dto.country,
    porDefecto: dto.default,
    creadaEl: dto.createdAt,
  };
}

function aCuerpo(datos: DatosDeDireccion): Record<string, unknown> {
  return {
    label: datos.etiqueta,
    fullName: datos.nombreCompleto,
    phone: datos.telefono,
    line1: datos.linea1,
    line2: datos.linea2,
    city: datos.ciudad,
    state: datos.provincia,
    postalCode: datos.codigoPostal,
    country: datos.pais,
    isDefault: datos.porDefecto,
  };
}

@Injectable()
export class DireccionesHttpAdapter implements DireccionesPort, AyudaDeDireccionPort {
  private readonly api = inject(ApiService);

  async lista(): Promise<Result<readonly Direccion[], AppError>> {
    return mapea(await this.api.get<DireccionDto[]>('/me/addresses'), (lista) =>
      lista.map(aDireccion),
    );
  }

  async crea(datos: DatosDeDireccion): Promise<Result<Direccion, AppError>> {
    return mapea(await this.api.post<DireccionDto>('/me/addresses', aCuerpo(datos)), aDireccion);
  }

  async actualiza(id: string, datos: DatosDeDireccion): Promise<Result<Direccion, AppError>> {
    return mapea(
      await this.api.put<DireccionDto>(`/me/addresses/${id}`, aCuerpo(datos)),
      aDireccion,
    );
  }

  async elimina(id: string): Promise<Result<void, AppError>> {
    return mapea(await this.api.delete<unknown>(`/me/addresses/${id}`), () => undefined);
  }

  async provincias(pais: string): Promise<Result<readonly Provincia[], AppError>> {
    const respuesta = await this.api.get<ProvinciaDto[]>('/shipping/regions', { country: pais });
    return mapea(respuesta, (lista) => lista.map((p) => ({ codigo: p.code, nombre: p.name })));
  }

  async formatoPostal(pais: string): Promise<Result<FormatoPostal, AppError>> {
    const respuesta = await this.api.get<FormatoPostalDto>('/shipping/postal-format', {
      country: pais,
    });
    return mapea(respuesta, (dto) => ({
      requerido: dto.required,
      patron: dto.pattern,
      ejemplo: dto.example,
    }));
  }
}
