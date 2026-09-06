import { Injectable, inject } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { NuevoTicket, Ticket } from '../../domain/model/ticket';
import { MIS_TICKETS_PORT } from '../../domain/port/tickets.port';

/**
 * Los tickets de quien tiene cuenta: consultarlos y abrir uno nuevo.
 *
 * <p>Devuelve `Result` en vez de tragarse el fallo porque un rechazo del backend al abrir un ticket
 * dejaba el formulario abierto, sin ticket y sin una palabra, justo en la pantalla a la que se llega
 * cuando algo ya ha ido mal.
 */
@Injectable({ providedIn: 'root' })
export class MisTickets {
  private readonly puerto = inject(MIS_TICKETS_PORT);

  consulta(): Promise<Result<readonly Ticket[], AppError>> {
    return this.puerto.mios();
  }

  abre(nuevo: NuevoTicket): Promise<Result<Ticket, AppError>> {
    return this.puerto.abre({
      ...nuevo,
      asunto: nuevo.asunto.trim(),
      cuerpo: nuevo.cuerpo?.trim() || undefined,
    });
  }
}
