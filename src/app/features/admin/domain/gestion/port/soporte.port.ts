import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { MensajeDeTicket, Ticket } from '../model/soporte';

/**
 * La bandeja de soporte vista por quien atiende.
 *
 * <p>Son los endpoints de ADMINISTRACIÓN (`/admin/tickets`), distintos de los del cliente (`/me/tickets`)
 * aunque devuelvan la misma forma: quien atiende ve los tickets de todo el mundo y quien compra solo
 * los suyos. Compartir un método para las dos cosas es cómo se acaban filtrando datos de otra persona.
 */
export interface SoportePort {
  tickets(estado?: string): Promise<Result<readonly Ticket[], AppError>>;
  mensajes(idTicket: string): Promise<Result<readonly MensajeDeTicket[], AppError>>;
  responde(idTicket: string, cuerpo: string): Promise<Result<void, AppError>>;
  resuelve(idTicket: string, resolucion: string): Promise<Result<void, AppError>>;
}

export const SOPORTE_PORT = new InjectionToken<SoportePort>('SoportePort');
