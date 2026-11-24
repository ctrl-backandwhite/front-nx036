import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import {
  Bulto,
  ContenidoDeBulto,
  HitoDeSeguimiento,
  Seguimiento,
  faseConocida,
} from '../domain/model/seguimiento';
import { SeguimientoDePedidoPort } from '../domain/port/pedidos.port';

interface HitoDto {
  status: string;
  phase?: string | null;
  description?: string;
  location?: string;
  occurredAt?: string;
}

interface ContenidoDto {
  title?: string;
  imageUrl?: string;
  variantName?: string;
  quantity: number;
}

interface BultoDto {
  sequenceNo: number;
  carrier?: string;
  trackingNumber?: string;
  weightGrams: number;
  estimatedDeliveryAt?: string;
  phase?: string | null;
  trackingUrl?: string | null;
  proofOfDeliveryUrl?: string | null;
  events?: HitoDto[];
  items?: ContenidoDto[];
}

interface SeguimientoDto {
  carrier?: string;
  trackingNumber?: string;
  estimatedDeliveryAt?: string;
  phase?: string | null;
  trackingUrl?: string | null;
  taxesOnDelivery?: boolean | null;
  events?: HitoDto[];
  shipments?: BultoDto[];
}

function aHito(dto: HitoDto): HitoDeSeguimiento {
  return {
    estado: dto.status,
    fase: faseConocida(dto.phase),
    descripcion: dto.description,
    ubicacion: dto.location,
    ocurridoEl: dto.occurredAt,
  };
}

function aContenido(dto: ContenidoDto): ContenidoDeBulto {
  return {
    titulo: dto.title,
    imagenUrl: dto.imageUrl,
    variante: dto.variantName,
    cantidad: dto.quantity,
  };
}

function aBulto(dto: BultoDto): Bulto {
  return {
    secuencia: dto.sequenceNo,
    transportista: dto.carrier,
    numeroDeSeguimiento: dto.trackingNumber,
    pesoGramos: dto.weightGrams,
    entregaEstimadaEl: dto.estimatedDeliveryAt,
    fase: faseConocida(dto.phase),
    urlDeSeguimiento: dto.trackingUrl ?? undefined,
    pruebaDeEntregaUrl: dto.proofOfDeliveryUrl ?? undefined,
    hitos: (dto.events ?? []).map(aHito),
    contenido: (dto.items ?? []).map(aContenido),
  };
}

/**
 * El seguimiento contra nuestro backend.
 *
 * <p>Aquí NO se deduplican los avisos repetidos: eso es una regla de negocio y vive en el dominio. El
 * adaptador solo cambia de vocabulario; si además decidiera qué se enseña, la regla quedaría atada al
 * transporte y no se podría probar sin una red de por medio.
 *
 * <p>Tampoco viaja `declarations`: son las partidas arancelarias que solo ve el panel de administración
 * y no tienen sitio en la pantalla del cliente.
 */
@Injectable()
export class SeguimientoHttpAdapter implements SeguimientoDePedidoPort {
  private readonly api = inject(ApiService);

  async consulta(id: string): Promise<Result<Seguimiento, AppError>> {
    const respuesta = await this.api.get<SeguimientoDto>(`/me/orders/${id}/tracking`);
    return mapea(respuesta, (dto) => ({
      transportista: dto.carrier,
      numeroDeSeguimiento: dto.trackingNumber,
      entregaEstimadaEl: dto.estimatedDeliveryAt,
      fase: faseConocida(dto.phase),
      urlDeSeguimiento: dto.trackingUrl ?? undefined,
      impuestosAlRecibir: dto.taxesOnDelivery === true,
      hitos: (dto.events ?? []).map(aHito),
      bultos: (dto.shipments ?? []).map(aBulto),
    }));
  }
}
