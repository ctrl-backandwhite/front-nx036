import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, fallo, mapea } from '@shared/result/result';
import { AppError, creaError } from '@shared/error/app-error';
import {
  CriterioDeIncidencias,
  EstadoDeIncidencia,
  IncidenciaDeEnvio,
  PaginaDeIncidencias,
} from '../../domain/logistica/model/incidencia-de-envio';
import {
  GuiasDeEnvioPort,
  IncidenciasDeEnvioPort,
} from '../../domain/logistica/port/incidencias-de-envio.port';

interface IncidenciaDto {
  id: string | number;
  orderId?: string | number;
  orderNumber?: string;
  shipmentSequenceNo?: number;
  carrier?: string;
  trackingNumber?: string;
  code?: string;
  cause?: string;
  ourFault?: boolean;
  status?: string;
  openedAt?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  note?: string;
}

/** Tolera las dos formas habituales de página: `items` (la del panel) y `content` (la de Spring). */
interface PaginaDto {
  items?: IncidenciaDto[];
  content?: IncidenciaDto[];
  totalElements?: number;
  totalPages?: number;
  page?: number;
  number?: number;
}

function aIncidencia(dto: IncidenciaDto): IncidenciaDeEnvio {
  return {
    id: String(dto.id),
    pedidoId: dto.orderId != null ? String(dto.orderId) : '',
    numeroDePedido: dto.orderNumber,
    secuenciaDelBulto: dto.shipmentSequenceNo,
    transportista: dto.carrier,
    numeroDeSeguimiento: dto.trackingNumber,
    codigo: dto.code,
    causa: dto.cause,
    culpaNuestra: dto.ourFault === true,
    estado: (dto.status === 'RESOLVED' ? 'RESOLVED' : 'OPEN') as EstadoDeIncidencia,
    abiertaEl: dto.openedAt,
    resueltaEl: dto.resolvedAt,
    resueltaPor: dto.resolvedBy,
    nota: dto.note,
  };
}

/** Las incidencias de envío y la guía de cada bulto, contra nuestro backend. */
@Injectable()
export class IncidenciasDeEnvioHttpAdapter implements IncidenciasDeEnvioPort, GuiasDeEnvioPort {
  private readonly api = inject(ApiService);

  async busca(criterio: CriterioDeIncidencias): Promise<Result<PaginaDeIncidencias, AppError>> {
    const respuesta = await this.api.get<PaginaDto>('/admin/shipments/incidents', {
      carrier: criterio.transportista,
      status: criterio.estado,
      page: criterio.pagina,
      size: criterio.tamano,
    });
    return mapea(respuesta, (dto) => ({
      incidencias: (dto.items ?? dto.content ?? []).map(aIncidencia),
      total: dto.totalElements ?? 0,
      paginas: dto.totalPages ?? 1,
      pagina: dto.page ?? dto.number ?? criterio.pagina,
    }));
  }

  async resuelve(id: string, nota: string): Promise<Result<void, AppError>> {
    const respuesta = await this.api.post<unknown>(
      `/admin/shipments/incidents/${encodeURIComponent(id)}/resolve`,
      { note: nota },
    );
    return mapea(respuesta, () => undefined);
  }

  async etiqueta(pedidoId: string, secuencia: number): Promise<Result<string, AppError>> {
    const respuesta = await this.api.get<{ url?: string }>(
      `/admin/orders/${pedidoId}/shipments/${secuencia}/label`,
    );
    if (!respuesta.ok) {
      return fallo(respuesta.error);
    }
    const url = respuesta.valor.url;
    return url ? mapea(respuesta, () => url) : fallo(creaError('no-encontrado', 'label'));
  }

  async anula(pedidoId: string, secuencia: number): Promise<Result<void, AppError>> {
    const respuesta = await this.api.post<unknown>(
      `/admin/orders/${pedidoId}/shipments/${secuencia}/cancel`,
    );
    return mapea(respuesta, () => undefined);
  }
}
