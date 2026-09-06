import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import {
  AgenteResumido,
  Cotizacion,
  NuevaSolicitud,
  SolicitudDeAprovisionamiento,
} from '../domain/model/aprovisionamiento';
import {
  AgentesDeAprovisionamientoPort,
  CotizacionesPort,
  SolicitudesDeAprovisionamientoPort,
} from '../domain/port/aprovisionamiento.port';

interface SolicitudDto {
  id: string;
  sourceUrl: string;
  source?: string;
  externalId?: string;
  status: string;
  titleHint?: string;
  notes?: string;
  selectedQuoteId?: string;
  createdAt: string;
  quotesCount: number;
}

interface AgenteDto {
  id: string;
  displayName: string;
  tier: string;
  satisfaction: number;
  completedJobs: number;
  avatarUrl?: string;
}

interface CotizacionDto {
  id: string;
  requestId: string;
  agent?: AgenteDto;
  priceUsdCents: number;
  etaDays: number;
  moq?: number;
  notes?: string;
  status: string;
  createdAt: string;
}

function aAgente(dto: AgenteDto): AgenteResumido {
  return {
    id: dto.id,
    nombre: dto.displayName,
    categoria: dto.tier,
    // `Number` explícito: el backend serializa la satisfacción como cadena en algunas rutas, y
    // `toFixed` sobre una cadena lanza justo al pintar la ficha del agente.
    satisfaccion: Number(dto.satisfaction ?? 0),
    trabajosCompletados: Number(dto.completedJobs ?? 0),
    avatarUrl: dto.avatarUrl,
  };
}

function aSolicitud(dto: SolicitudDto): SolicitudDeAprovisionamiento {
  return {
    id: dto.id,
    urlDeOrigen: dto.sourceUrl,
    origen: dto.source,
    idExterno: dto.externalId,
    estado: dto.status,
    tituloOrientativo: dto.titleHint,
    notas: dto.notes,
    cotizacionElegida: dto.selectedQuoteId,
    creadaEl: dto.createdAt,
    cuantasCotizaciones: dto.quotesCount ?? 0,
  };
}

function aCotizacion(dto: CotizacionDto): Cotizacion {
  return {
    id: dto.id,
    idSolicitud: dto.requestId,
    agente: dto.agent ? aAgente(dto.agent) : undefined,
    precioEnCentimosUsd: Number(dto.priceUsdCents ?? 0),
    diasEstimados: Number(dto.etaDays ?? 0),
    cantidadMinima: dto.moq,
    notas: dto.notes,
    estado: dto.status,
    creadaEl: dto.createdAt,
  };
}

/** Las solicitudes de aprovisionamiento y sus cotizaciones, contra nuestro backend. */
@Injectable()
export class AprovisionamientoHttpAdapter
  implements SolicitudesDeAprovisionamientoPort, CotizacionesPort, AgentesDeAprovisionamientoPort
{
  private readonly api = inject(ApiService);

  async mias(): Promise<Result<readonly SolicitudDeAprovisionamiento[], AppError>> {
    return mapea(await this.api.get<SolicitudDto[]>('/me/sourcing/requests'), (filas) =>
      filas.map(aSolicitud),
    );
  }

  async crea(
    solicitud: NuevaSolicitud,
  ): Promise<Result<SolicitudDeAprovisionamiento, AppError>> {
    const respuesta = await this.api.post<SolicitudDto>('/me/sourcing/requests', {
      url: solicitud.url,
      titleHint: solicitud.tituloOrientativo,
      notes: solicitud.notas,
    });
    return mapea(respuesta, aSolicitud);
  }

  async cancela(id: string): Promise<Result<SolicitudDeAprovisionamiento, AppError>> {
    return mapea(
      await this.api.post<SolicitudDto>(`/me/sourcing/requests/${id}/cancel`),
      aSolicitud,
    );
  }

  async elimina(id: string): Promise<Result<void, AppError>> {
    return mapea(await this.api.delete<void>(`/me/sourcing/requests/${id}`), () => undefined);
  }

  async deLaSolicitud(id: string): Promise<Result<readonly Cotizacion[], AppError>> {
    return mapea(
      await this.api.get<CotizacionDto[]>(`/me/sourcing/requests/${id}/quotes`),
      (filas) => filas.map(aCotizacion),
    );
  }

  async elige(
    idSolicitud: string,
    idCotizacion: string,
  ): Promise<Result<SolicitudDeAprovisionamiento, AppError>> {
    return mapea(
      await this.api.post<SolicitudDto>(
        `/me/sourcing/requests/${idSolicitud}/select-quote/${idCotizacion}`,
      ),
      aSolicitud,
    );
  }

  async lista(): Promise<Result<readonly AgenteResumido[], AppError>> {
    return mapea(await this.api.get<AgenteDto[]>('/me/sourcing/agents'), (filas) =>
      filas.map(aAgente),
    );
  }
}
