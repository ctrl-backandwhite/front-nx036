import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { CoberturaDeTransportista } from '../../domain/logistica/model/cobertura-transportista';
import { CoberturaDeTransportistaPort } from '../../domain/logistica/port/configuracion-logistica.port';

/** La forma en que el backend habla de una cobertura. No sale de este fichero. */
interface CoberturaDto {
  carrier: string;
  countryCode: string;
  countryName?: string;
  zone?: string;
  baseCents?: number;
  perKgCents?: number;
  etaMinDays?: number;
  etaMaxDays?: number;
  enabled?: boolean;
}

function aCobertura(dto: CoberturaDto): CoberturaDeTransportista {
  return {
    carrier: dto.carrier,
    pais: dto.countryCode,
    nombre: dto.countryName ?? dto.countryCode,
    zona: dto.zone ?? '',
    baseCents: dto.baseCents ?? 0,
    porKgCents: dto.perKgCents ?? 0,
    diasMin: dto.etaMinDays ?? 0,
    diasMax: dto.etaMaxDays ?? 0,
    // Ausente se toma como HABILITADO: una fila que llega sin la marca es un destino que se sirve, y
    // darla por apagada haría creer que el país no está cubierto cuando sí lo está.
    habilitado: dto.enabled !== false,
  };
}

function aDto(cobertura: CoberturaDeTransportista): CoberturaDto {
  return {
    carrier: cobertura.carrier.trim().toUpperCase(),
    countryCode: cobertura.pais.trim().toUpperCase(),
    countryName: cobertura.nombre.trim(),
    zone: cobertura.zona.trim(),
    baseCents: cobertura.baseCents,
    perKgCents: cobertura.porKgCents,
    etaMinDays: cobertura.diasMin,
    etaMaxDays: cobertura.diasMax,
    enabled: cobertura.habilitado,
  };
}

/**
 * La cobertura contra nuestro backend.
 *
 * <p>Alta y edición son la MISMA llamada: la clave del registro es transportista+país, así que guardar
 * una fila que ya existe la sustituye.
 */
@Injectable()
export class CoberturaTransportistaHttpAdapter implements CoberturaDeTransportistaPort {
  private readonly api = inject(ApiService);

  async lista(): Promise<Result<readonly CoberturaDeTransportista[], AppError>> {
    const respuesta = await this.api.get<CoberturaDto[]>('/admin/carrier-coverage');
    return mapea(respuesta, (filas) => (filas ?? []).map(aCobertura));
  }

  async transportistas(): Promise<Result<readonly string[], AppError>> {
    const respuesta = await this.api.get<string[]>('/admin/carrier-coverage/carriers');
    return mapea(respuesta, (nombres) => nombres ?? []);
  }

  async guarda(cobertura: CoberturaDeTransportista): Promise<Result<void, AppError>> {
    const transportista = cobertura.carrier.trim().toUpperCase();
    const pais = cobertura.pais.trim().toUpperCase();
    const ruta = `/admin/carrier-coverage/${encodeURIComponent(transportista)}/${encodeURIComponent(pais)}`;
    return mapea(await this.api.put<unknown>(ruta, aDto(cobertura)), () => undefined);
  }

  async borra(carrier: string, pais: string): Promise<Result<void, AppError>> {
    const ruta = `/admin/carrier-coverage/${encodeURIComponent(carrier)}/${encodeURIComponent(pais)}`;
    return mapea(await this.api.delete<unknown>(ruta), () => undefined);
  }
}
