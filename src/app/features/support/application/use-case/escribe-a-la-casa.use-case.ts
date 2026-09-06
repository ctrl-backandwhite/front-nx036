import { Service, inject } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { CONTACTO_PORT, MensajeDeContacto } from '../../domain/port/contacto.port';

/**
 * Mandar el formulario público de contacto.
 *
 * <p>Recorta todo antes de enviarlo: un asunto con espacios delante llega así a la bandeja y se lee
 * como un fallo nuestro.
 */
@Service()
export class EscribeALaCasa {
  private readonly contacto = inject(CONTACTO_PORT);

  ejecuta(mensaje: MensajeDeContacto): Promise<Result<void, AppError>> {
    return this.contacto.envia({
      nombre: mensaje.nombre.trim(),
      email: mensaje.email.trim(),
      asunto: mensaje.asunto.trim(),
      mensaje: mensaje.mensaje.trim(),
    });
  }
}
