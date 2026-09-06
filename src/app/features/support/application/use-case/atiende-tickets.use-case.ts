import { Injectable, inject } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { Ticket } from '../../domain/model/ticket';
import { TICKETS_DE_SOPORTE_PORT } from '../../domain/port/tickets.port';

/**
 * La bandeja del personal de la casa: ver los tickets y darlos por resueltos.
 *
 * <p>Resolver devuelve `Result` y no se traga el fallo: sin eso, un rechazo del backend dejaba el
 * diálogo abierto y quieto, el administrador lo cerraba dando el caso por atendido y el cliente seguía
 * esperando con el ticket abierto.
 */
@Injectable({ providedIn: 'root' })
export class AtiendeTickets {
  private readonly puerto = inject(TICKETS_DE_SOPORTE_PORT);

  consulta(estado?: string): Promise<Result<readonly Ticket[], AppError>> {
    return this.puerto.lista(estado || undefined);
  }

  resuelve(id: string, resolucion: string): Promise<Result<Ticket, AppError>> {
    return this.puerto.resuelve(id, resolucion.trim());
  }
}
