import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import {
  FiltroDeTarifas,
  TarifaDeTransportista,
} from '../../domain/logistica/model/tarifa-transportista';
import { TarifasDeTransportistaPort } from '../../domain/logistica/port/configuracion-logistica.port';

/** La forma en que el backend habla de una tarifa. No sale de este fichero. */
interface TarifaDto {
  id: string;
  channelCode: string;
  countryCode: string;
  nombreCanal?: string;
  hastaGramos: number;
  registroRmb: number;
  precioRmbKg: number;
  minGramos: number;
  escalonGramos?: number;
  diasMin: number;
  diasMax: number;
  desvioRmb: number;
  activo: boolean;
  medidoEn?: string;
  ejemplo500gRmb: number;
  vieja: boolean;
}

interface RefrescoDto {
  filas: number;
  destinos: number;
  detalle?: string;
}

function aTarifa(dto: TarifaDto): TarifaDeTransportista {
  return {
    id: dto.id,
    canal: dto.channelCode,
    pais: dto.countryCode,
    nombreCanal: dto.nombreCanal,
    hastaGramos: dto.hastaGramos,
    registroRmb: Number(dto.registroRmb ?? 0),
    precioRmbKg: Number(dto.precioRmbKg ?? 0),
    minGramos: dto.minGramos ?? 0,
    escalonGramos: dto.escalonGramos ?? 0,
    diasMin: dto.diasMin ?? 0,
    diasMax: dto.diasMax ?? 0,
    desvioRmb: Number(dto.desvioRmb ?? 0),
    activo: dto.activo !== false,
    medidoEn: dto.medidoEn,
    ejemplo500gRmb: Number(dto.ejemplo500gRmb ?? 0),
    vieja: !!dto.vieja,
  };
}

/**
 * La tarifa del transportista contra nuestro backend.
 *
 * <p>El filtro viaja en la dirección y no en el cuerpo: así una vista filtrada se puede compartir por
 * enlace, que es lo que se hace cuando alguien pregunta «¿qué cobramos a Japón?».
 */
@Injectable()
export class TarifasTransportistaHttpAdapter implements TarifasDeTransportistaPort {
  private readonly api = inject(ApiService);

  async lista(filtro: FiltroDeTarifas): Promise<Result<readonly TarifaDeTransportista[], AppError>> {
    const parametros = new URLSearchParams();
    if (filtro.pais) {
      parametros.set('country', filtro.pais);
    }
    if (filtro.canal) {
      parametros.set('channel', filtro.canal);
    }
    if (filtro.soloViejas) {
      parametros.set('soloViejas', 'true');
    }
    if (filtro.soloDesviadas) {
      parametros.set('soloDesviadas', 'true');
    }
    if (filtro.incluirInactivas) {
      parametros.set('incluirInactivas', 'true');
    }
    const consulta = parametros.toString();
    const respuesta = await this.api.get<TarifaDto[]>(
      `/admin/carrier-rates${consulta ? `?${consulta}` : ''}`,
    );
    return mapea(respuesta, (filas) => (filas ?? []).map(aTarifa));
  }

  async refrescaDestino(pais: string): Promise<Result<number, AppError>> {
    const ruta = `/admin/carrier-rates/refresh/${encodeURIComponent(pais.trim().toUpperCase())}`;
    return mapea(await this.api.post<RefrescoDto>(ruta, {}), (r) => r?.filas ?? 0);
  }

  async refrescaTodo(): Promise<Result<number, AppError>> {
    return mapea(await this.api.post<RefrescoDto>('/admin/carrier-rates/refresh', {}), (r) => r?.filas ?? 0);
  }

  async guarda(tarifa: TarifaDeTransportista): Promise<Result<void, AppError>> {
    const cuerpo = {
      channelCode: tarifa.canal.trim().toUpperCase(),
      countryCode: tarifa.pais.trim().toUpperCase(),
      hastaGramos: tarifa.hastaGramos,
      registroRmb: tarifa.registroRmb,
      precioRmbKg: tarifa.precioRmbKg,
      minGramos: tarifa.minGramos,
      diasMin: tarifa.diasMin,
      diasMax: tarifa.diasMax,
      nombreCanal: tarifa.nombreCanal ?? '',
      activo: tarifa.activo,
    };
    return mapea(await this.api.put<unknown>('/admin/carrier-rates', cuerpo), () => undefined);
  }

  async borra(id: string): Promise<Result<void, AppError>> {
    const ruta = `/admin/carrier-rates/${encodeURIComponent(id)}`;
    return mapea(await this.api.delete<unknown>(ruta), () => undefined);
  }
}
