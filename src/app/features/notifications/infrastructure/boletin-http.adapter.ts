import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import {
  BoletinPort,
  PreferenciasDeCorreoPort,
  SuscripcionAlBoletin,
} from '../domain/port/boletin.port';

/**
 * El boletín contra nuestro backend.
 *
 * <p>La SUSCRIPCIÓN lleva CAPTCHA, pero no se resuelve aquí: lo inyecta el interceptor del núcleo para
 * las rutas que lo exigen. Un formulario de correo abierto al público sin reto se llena de direcciones
 * falsas en un día.
 */
@Injectable()
export class BoletinHttpAdapter implements BoletinPort, PreferenciasDeCorreoPort {
  private readonly api = inject(ApiService);

  async suscribe(email: string): Promise<Result<SuscripcionAlBoletin, AppError>> {
    const respuesta = await this.api.post<{ status: string; alreadySubscribed: boolean }>(
      '/newsletter/subscribe',
      { email },
    );
    return mapea(respuesta, (r) => ({ yaEstaba: !!r?.alreadySubscribed }));
  }

  async daDeBaja(testigo: string): Promise<Result<boolean, AppError>> {
    const respuesta = await this.api.post<{ unsubscribed: boolean }>('/newsletter/unsubscribe', {
      token: testigo,
    });
    return mapea(respuesta, (r) => !!r?.unsubscribed);
  }

  async consulta(): Promise<Result<{ sinPublicidad: boolean }, AppError>> {
    const respuesta = await this.api.get<{ marketingOptOut: boolean }>('/me/email-preferences');
    return mapea(respuesta, (r) => ({ sinPublicidad: !!r?.marketingOptOut }));
  }

  async actualiza(sinPublicidad: boolean): Promise<Result<{ sinPublicidad: boolean }, AppError>> {
    const respuesta = await this.api.put<{ marketingOptOut: boolean }>('/me/email-preferences', {
      marketingOptOut: sinPublicidad,
    });
    return mapea(respuesta, (r) => ({ sinPublicidad: !!r?.marketingOptOut }));
  }
}
