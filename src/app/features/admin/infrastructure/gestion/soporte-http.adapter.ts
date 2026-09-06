import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { MensajeDeTicket, Ticket } from '../../domain/gestion/model/soporte';
import { SoportePort } from '../../domain/gestion/port/soporte.port';
import { sinCuerpo } from './sin-cuerpo';

interface TicketDto {
  id: string;
  kind?: string;
  status?: string;
  priority?: string;
  subject: string;
  body?: string;
  resolution?: string;
  createdAt: string;
}

interface MensajeDto {
  id: string;
  fromSupport?: boolean;
  body: string;
  createdAt: string;
}

/**
 * La bandeja de soporte, por los endpoints de ADMINISTRACIÓN.
 *
 * <p>`/admin/tickets` y `/me/tickets` devuelven la misma forma pero NO lo mismo: el primero trae los
 * tickets de todo el mundo. Tener un solo adaptador para las dos superficies es como se acaban
 * enseñando los tickets de otra persona.
 */
@Injectable()
export class SoporteHttpAdapter implements SoportePort {
  private readonly api = inject(ApiService);

  async tickets(estado?: string): Promise<Result<readonly Ticket[], AppError>> {
    const respuesta = await this.api.get<TicketDto[]>('/admin/tickets', { status: estado ?? '' });
    return mapea(respuesta, (lista) =>
      (lista ?? []).map((dto) => ({
        id: dto.id,
        clase: dto.kind ?? '',
        estado: dto.status ?? '',
        prioridad: dto.priority ?? '',
        asunto: dto.subject,
        creadoEl: dto.createdAt,
        ...(dto.body ? { cuerpo: dto.body } : {}),
        ...(dto.resolution ? { resolucion: dto.resolution } : {}),
      })),
    );
  }

  async mensajes(idTicket: string): Promise<Result<readonly MensajeDeTicket[], AppError>> {
    const respuesta = await this.api.get<MensajeDto[]>(`/admin/tickets/${idTicket}/replies`);
    return mapea(respuesta, (lista) =>
      (lista ?? []).map((dto) => ({
        id: dto.id,
        deSoporte: dto.fromSupport ?? false,
        cuerpo: dto.body,
        creadoEl: dto.createdAt,
      })),
    );
  }

  responde(idTicket: string, cuerpo: string): Promise<Result<void, AppError>> {
    return sinCuerpo(this.api.post(`/admin/tickets/${idTicket}/replies`, { body: cuerpo }));
  }

  resuelve(idTicket: string, resolucion: string): Promise<Result<void, AppError>> {
    return sinCuerpo(this.api.put(`/admin/tickets/${idTicket}/resolve`, { resolution: resolucion }));
  }
}
