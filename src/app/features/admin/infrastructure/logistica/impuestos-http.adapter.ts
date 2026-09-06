import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import {
  DatosDeImpuesto,
  DatosDeRegion,
  ImpuestoDePais,
  RegionFiscal,
  aPuntosBasicos,
  tasaDeRegion,
} from '../../domain/logistica/model/impuesto';
import { ImpuestosPort } from '../../domain/logistica/port/configuracion-logistica.port';

interface ImpuestoDto {
  countryCode: string;
  label?: string;
  rateBps?: number;
  ratePercent?: number;
  active?: boolean;
}

interface RegionDto {
  countryCode: string;
  regionCode: string;
  regionName: string;
  rateBps?: number | null;
  ratePercent?: number | null;
  active?: boolean;
  position?: number;
}

function aImpuesto(dto: ImpuestoDto): ImpuestoDePais {
  return {
    pais: dto.countryCode,
    etiqueta: dto.label,
    puntosBasicos: dto.rateBps ?? 0,
    porcentaje: dto.ratePercent ?? 0,
    activo: dto.active !== false,
  };
}

function aRegion(dto: RegionDto): RegionFiscal {
  return {
    pais: dto.countryCode,
    codigo: dto.regionCode,
    nombre: dto.regionName,
    puntosBasicos: dto.rateBps ?? null,
    porcentaje: dto.ratePercent ?? null,
    activo: dto.active !== false,
    posicion: dto.position ?? 0,
  };
}

/**
 * Los impuestos por destino, contra nuestro backend.
 *
 * <p>Se guardan en PUNTOS BÁSICOS porque un porcentaje con decimales en coma flotante acaba en tasas de
 * 20,999999. La conversión vive en el dominio y se usa aquí en un solo sentido: hacia dentro llega ya
 * el porcentaje calculado por el servidor, que es la única fuente de verdad de lo que se cobra.
 */
@Injectable()
export class ImpuestosHttpAdapter implements ImpuestosPort {
  private readonly api = inject(ApiService);

  async lista(): Promise<Result<readonly ImpuestoDePais[], AppError>> {
    const respuesta = await this.api.get<ImpuestoDto[]>('/admin/tax-rates');
    return mapea(respuesta, (filas) => (filas ?? []).map(aImpuesto));
  }

  async guarda(datos: DatosDeImpuesto): Promise<Result<void, AppError>> {
    const pais = datos.pais.trim().toUpperCase();
    const respuesta = await this.api.put<unknown>(`/admin/tax-rates/${pais}`, {
      label: datos.etiqueta,
      rateBps: aPuntosBasicos(datos.porcentaje),
      active: datos.activo,
    });
    return mapea(respuesta, () => undefined);
  }

  async borra(pais: string): Promise<Result<void, AppError>> {
    return mapea(await this.api.delete<unknown>(`/admin/tax-rates/${pais}`), () => undefined);
  }

  async regiones(pais: string): Promise<Result<readonly RegionFiscal[], AppError>> {
    const respuesta = await this.api.get<RegionDto[]>('/admin/regions', { country: pais });
    return mapea(respuesta, (filas) => (filas ?? []).map(aRegion));
  }

  async guardaRegion(pais: string, datos: DatosDeRegion): Promise<Result<void, AppError>> {
    const codigo = datos.codigo.trim().toUpperCase();
    const respuesta = await this.api.put<unknown>(`/admin/regions/${pais}/${codigo}`, {
      name: datos.nombre.trim(),
      // El nulo NO es un cero: significa «usa la tasa nacional». Un cero sería «exenta», que es otra
      // configuración y perfectamente válida.
      rateBps: tasaDeRegion(datos.porcentaje),
      active: datos.activo,
    });
    return mapea(respuesta, () => undefined);
  }

  async borraRegion(pais: string, codigo: string): Promise<Result<void, AppError>> {
    return mapea(await this.api.delete<unknown>(`/admin/regions/${pais}/${codigo}`), () => undefined);
  }
}
