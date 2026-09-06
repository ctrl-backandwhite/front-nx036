import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { ClaseDeTicket, MensajeDelHilo, NuevoTicket, Ticket } from '../domain/model/ticket';
import { HiloDeTicketPort, MisTicketsPort, TicketsDeSoportePort } from '../domain/port/tickets.port';

/** La forma en que habla el BACKEND. Vive aquí y no sale de este fichero. */
interface TicketDto {
  id: string;
  kind: ClaseDeTicket;
  subject: string;
  body?: string;
  orderId?: string;
  status: string;
  priority: string;
  resolution?: string;
  createdAt: string;
}

interface MensajeDto {
  id: string;
  fromSupport: boolean;
  body: string;
  createdAt: string;
}

function aTicket(dto: TicketDto): Ticket {
  return {
    id: dto.id,
    clase: dto.kind,
    asunto: dto.subject,
    cuerpo: dto.body,
    idPedido: dto.orderId,
    estado: dto.status,
    prioridad: dto.priority,
    resolucion: dto.resolution,
    creadoEl: dto.createdAt,
  };
}

function aMensaje(dto: MensajeDto): MensajeDelHilo {
  return {
    id: dto.id,
    deSoporte: dto.fromSupport,
    cuerpo: dto.body,
    creadoEl: dto.createdAt,
  };
}

/**
 * Los tickets contra nuestro backend.
 *
 * <p>Implementa los TRES puertos porque los tres se resuelven contra el mismo servicio; separarlos en
 * tres clases idénticas solo añadiría ficheros. Lo que importa es que quien los consume vea tres
 * contratos pequeños y pueda sustituir el que necesite.
 *
 * <p>Cada lado tiene su RUTA: `/me/tickets` para quien abrió el ticket y `/admin/tickets` para el
 * personal de la casa. Quien decide si se puede es el backend; aquí solo se elige la puerta.
 */
@Injectable()
export class TicketsHttpAdapter implements MisTicketsPort, TicketsDeSoportePort, HiloDeTicketPort {
  private readonly api = inject(ApiService);

  async mios(): Promise<Result<readonly Ticket[], AppError>> {
    return mapea(await this.api.get<TicketDto[]>('/me/tickets'), (t) => (t ?? []).map(aTicket));
  }

  async abre(nuevo: NuevoTicket): Promise<Result<Ticket, AppError>> {
    const respuesta = await this.api.post<TicketDto>('/me/tickets', {
      kind: nuevo.clase,
      subject: nuevo.asunto,
      body: nuevo.cuerpo,
      orderId: nuevo.idPedido,
      priority: nuevo.prioridad,
    });
    return mapea(respuesta, aTicket);
  }

  async lista(estado?: string): Promise<Result<readonly Ticket[], AppError>> {
    const respuesta = await this.api.get<TicketDto[]>('/admin/tickets', { status: estado });
    return mapea(respuesta, (t) => (t ?? []).map(aTicket));
  }

  async resuelve(id: string, resolucion: string): Promise<Result<Ticket, AppError>> {
    const respuesta = await this.api.put<TicketDto>(`/admin/tickets/${id}/resolve`, {
      resolution: resolucion,
    });
    return mapea(respuesta, aTicket);
  }

  async mensajes(
    id: string,
    comoSoporte: boolean,
  ): Promise<Result<readonly MensajeDelHilo[], AppError>> {
    const camino = comoSoporte ? `/admin/tickets/${id}/replies` : `/me/tickets/${id}/replies`;
    return mapea(await this.api.get<MensajeDto[]>(camino), (m) => (m ?? []).map(aMensaje));
  }

  async responde(
    id: string,
    cuerpo: string,
    comoSoporte: boolean,
  ): Promise<Result<MensajeDelHilo, AppError>> {
    const camino = comoSoporte ? `/admin/tickets/${id}/replies` : `/me/tickets/${id}/replies`;
    return mapea(await this.api.post<MensajeDto>(camino, { body: cuerpo }), aMensaje);
  }
}
