import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { ContactoPort, MensajeDeContacto } from '../domain/port/contacto.port';

/** El formulario público de contacto contra nuestro backend. */
@Injectable()
export class ContactoHttpAdapter implements ContactoPort {
  private readonly api = inject(ApiService);

  async envia(mensaje: MensajeDeContacto): Promise<Result<void, AppError>> {
    return mapea(
      await this.api.post<void>('/contact', {
        name: mensaje.nombre,
        email: mensaje.email,
        subject: mensaje.asunto,
        message: mensaje.mensaje,
      }),
      () => undefined,
    );
  }
}
