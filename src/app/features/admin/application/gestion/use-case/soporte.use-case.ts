import { Injectable, inject } from '@angular/core';
import { Result, fallo } from '@shared/result/result';
import { AppError, creaError } from '@shared/error/app-error';
import { MensajeDeTicket, Ticket } from '../../../domain/gestion/model/soporte';
import { SOPORTE_PORT } from '../../../domain/gestion/port/soporte.port';

@Injectable()
export class ConsultaTickets {
  private readonly soporte = inject(SOPORTE_PORT);

  ejecuta(estado?: string): Promise<Result<readonly Ticket[], AppError>> {
    return this.soporte.tickets(estado);
  }
}

@Injectable()
export class ConsultaElHilo {
  private readonly soporte = inject(SOPORTE_PORT);

  ejecuta(idTicket: string): Promise<Result<readonly MensajeDeTicket[], AppError>> {
    return this.soporte.mensajes(idTicket);
  }
}

@Injectable()
export class RespondeAlTicket {
  private readonly soporte = inject(SOPORTE_PORT);

  ejecuta(idTicket: string, cuerpo: string): Promise<Result<void, AppError>> {
    const limpio = cuerpo.trim();
    if (!limpio) {
      return Promise.resolve(fallo(creaError('peticion-invalida')));
    }
    return this.soporte.responde(idTicket, limpio);
  }
}

/**
 * Cierra el caso.
 *
 * <p>La resolución se le enseña a quien abrió el ticket: cerrar sin explicación deja al cliente sin
 * saber qué pasó con su reclamación, así que se exige texto.
 */
@Injectable()
export class ResuelveElTicket {
  private readonly soporte = inject(SOPORTE_PORT);

  ejecuta(idTicket: string, resolucion: string): Promise<Result<void, AppError>> {
    const limpia = resolucion.trim();
    if (!limpia) {
      return Promise.resolve(fallo(creaError('peticion-invalida')));
    }
    return this.soporte.resuelve(idTicket, limpia);
  }
}
