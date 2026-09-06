import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { Divisa } from '../../domain/gestion/model/dinero';
import { TiposDeCambioPort } from '../../domain/gestion/port/tipos-de-cambio.port';

export interface DivisaDto {
  code: string;
  name?: string;
  symbol?: string;
  countryCode?: string;
  flagEmoji?: string;
  locale?: string;
  rateVsUsd?: number;
  active?: boolean;
  lastSyncedAt?: string;
}

/** Traduce el registro de divisas del backend al vocabulario del dominio. Lo usan los dos adaptadores. */
export function aDivisa(dto: DivisaDto): Divisa {
  return {
    codigo: dto.code,
    nombre: dto.name ?? dto.code,
    simbolo: dto.symbol ?? '',
    tasaVsUsd: Number(dto.rateVsUsd ?? 0),
    activa: dto.active ?? false,
    ...(dto.locale ? { locale: dto.locale } : {}),
    ...(dto.flagEmoji ? { banderaEmoji: dto.flagEmoji } : {}),
    ...(dto.countryCode ? { paisCodigo: dto.countryCode } : {}),
    ...(dto.lastSyncedAt ? { sincronizadaEl: dto.lastSyncedAt } : {}),
  };
}

/**
 * Las tasas vigentes, del endpoint PÚBLICO.
 *
 * <p>Es el mismo que consulta la tienda a propósito: si el panel usara el de administración —que incluye
 * las divisas apagadas— podría formatear un importe con una tasa que ningún comprador llega a ver.
 */
@Injectable()
export class TiposDeCambioHttpAdapter implements TiposDeCambioPort {
  private readonly api = inject(ApiService);

  async vigentes(): Promise<Result<readonly Divisa[], AppError>> {
    const respuesta = await this.api.get<DivisaDto[]>('/currency/rates');
    return mapea(respuesta, (lista) => (lista ?? []).map(aDivisa));
  }
}
