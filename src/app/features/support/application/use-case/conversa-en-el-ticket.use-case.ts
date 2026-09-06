import { Service, inject } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { MensajeDelHilo } from '../../domain/model/ticket';
import { HILO_DE_TICKET_PORT } from '../../domain/port/tickets.port';

/**
 * El hilo de mensajes de un ticket, desde cualquiera de los dos lados.
 *
 * <p>`comoSoporte` elige la puerta del backend, no el permiso: el permiso lo comprueba él. Se pasa como
 * argumento en vez de guardarse porque el mismo componente sirve al cliente y al panel, y tener dos
 * casos de uso idénticos con una constante distinta era duplicar por nada.
 */
@Service()
export class ConversaEnElTicket {
  private readonly hilo = inject(HILO_DE_TICKET_PORT);

  mensajes(id: string, comoSoporte: boolean): Promise<Result<readonly MensajeDelHilo[], AppError>> {
    return this.hilo.mensajes(id, comoSoporte);
  }

  responde(
    id: string,
    cuerpo: string,
    comoSoporte: boolean,
  ): Promise<Result<MensajeDelHilo, AppError>> {
    return this.hilo.responde(id, cuerpo.trim(), comoSoporte);
  }
}
