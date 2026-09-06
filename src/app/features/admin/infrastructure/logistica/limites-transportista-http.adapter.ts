import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { LimiteDeTransportista } from '../../domain/logistica/model/limite-transportista';
import { LimitesDeTransportistaPort } from '../../domain/logistica/port/configuracion-logistica.port';

/** La forma en que el backend habla de un límite. No sale de este fichero. */
interface LimiteDto {
  channelCode: string;
  countryCode: string;
  maxWeightGrams?: number;
  volumetricDivisor?: number;
  minBillableGrams?: number;
  maxLengthMm?: number;
  maxWidthMm?: number;
  maxHeightMm?: number;
  singleParcelOnly?: boolean;
  notes?: string;
  active?: boolean;
}

function aLimite(dto: LimiteDto): LimiteDeTransportista {
  return {
    canal: dto.channelCode,
    pais: dto.countryCode,
    pesoMaximoGramos: dto.maxWeightGrams ?? 0,
    divisorVolumetrico: dto.volumetricDivisor ?? 0,
    minimoFacturableGramos: dto.minBillableGrams ?? 0,
    largoMaximoMm: dto.maxLengthMm ?? 0,
    anchoMaximoMm: dto.maxWidthMm ?? 0,
    altoMaximoMm: dto.maxHeightMm ?? 0,
    bultoUnico: !!dto.singleParcelOnly,
    notas: dto.notes,
    // Ausente se toma como ACTIVO: una fila que llega sin la marca sigue siendo un límite que aplica,
    // y darla por apagada haría creer que el canal no tiene tope de peso.
    activo: dto.active !== false,
  };
}

function aDto(limite: LimiteDeTransportista, canal: string): LimiteDto {
  return {
    channelCode: canal,
    countryCode: limite.pais,
    maxWeightGrams: limite.pesoMaximoGramos,
    volumetricDivisor: limite.divisorVolumetrico,
    minBillableGrams: limite.minimoFacturableGramos,
    maxLengthMm: limite.largoMaximoMm,
    maxWidthMm: limite.anchoMaximoMm,
    maxHeightMm: limite.altoMaximoMm,
    singleParcelOnly: limite.bultoUnico,
    notes: limite.notas,
    active: limite.activo,
  };
}

/**
 * Los límites del transportista contra nuestro backend.
 *
 * <p>Alta y edición son la MISMA llamada: la clave del registro es canal+país, así que guardar una fila
 * que ya existe la sustituye. El asterisco del comodín es un carácter válido en una ruta y
 * `encodeURIComponent` lo deja pasar tal cual.
 */
@Injectable()
export class LimitesTransportistaHttpAdapter implements LimitesDeTransportistaPort {
  private readonly api = inject(ApiService);

  async lista(): Promise<Result<readonly LimiteDeTransportista[], AppError>> {
    const respuesta = await this.api.get<LimiteDto[]>('/admin/carrier-limits');
    return mapea(respuesta, (filas) => (filas ?? []).map(aLimite));
  }

  async guarda(limite: LimiteDeTransportista): Promise<Result<void, AppError>> {
    const canal = limite.canal.trim().toUpperCase();
    const ruta = `/admin/carrier-limits/${encodeURIComponent(canal)}/${encodeURIComponent(limite.pais)}`;
    return mapea(await this.api.put<unknown>(ruta, aDto(limite, canal)), () => undefined);
  }

  async borra(canal: string, pais: string): Promise<Result<void, AppError>> {
    const ruta = `/admin/carrier-limits/${encodeURIComponent(canal)}/${encodeURIComponent(pais)}`;
    return mapea(await this.api.delete<unknown>(ruta), () => undefined);
  }
}
