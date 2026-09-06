import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { MensajeDelHilo, NuevoTicket, Ticket } from '../model/ticket';

/**
 * Los tickets de quien tiene cuenta: los suyos y abrir uno nuevo.
 *
 * <p>Partido por CAPACIDAD y no por sujeto: la pantalla del cliente solo necesita este, y no tiene por
 * qué proveer también lo que hace el personal de la casa.
 */
export interface MisTicketsPort {
  mios(): Promise<Result<readonly Ticket[], AppError>>;
  abre(nuevo: NuevoTicket): Promise<Result<Ticket, AppError>>;
}

export const MIS_TICKETS_PORT = new InjectionToken<MisTicketsPort>('MisTicketsPort');

/** La bandeja del personal de la casa: todos los tickets y darlos por resueltos. */
export interface TicketsDeSoportePort {
  lista(estado?: string): Promise<Result<readonly Ticket[], AppError>>;
  resuelve(id: string, resolucion: string): Promise<Result<Ticket, AppError>>;
}

export const TICKETS_DE_SOPORTE_PORT = new InjectionToken<TicketsDeSoportePort>(
  'TicketsDeSoportePort',
);

/**
 * El HILO de un ticket, leído y escrito desde los dos lados.
 *
 * <p>`comoSoporte` no es un permiso: es qué extremo de la conversación se está usando. El backend tiene
 * rutas distintas para cada uno y es él quien comprueba el permiso; aquí solo se elige la puerta.
 */
export interface HiloDeTicketPort {
  mensajes(id: string, comoSoporte: boolean): Promise<Result<readonly MensajeDelHilo[], AppError>>;
  responde(
    id: string,
    cuerpo: string,
    comoSoporte: boolean,
  ): Promise<Result<MensajeDelHilo, AppError>>;
}

export const HILO_DE_TICKET_PORT = new InjectionToken<HiloDeTicketPort>('HiloDeTicketPort');
