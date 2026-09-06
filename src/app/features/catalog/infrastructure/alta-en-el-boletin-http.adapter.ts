import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { AltaEnElBoletin, AltaEnElBoletinPort } from '../domain/port/alta-en-el-boletin.port';

/**
 * El alta contra nuestro backend.
 *
 * <p>La ruta lleva CAPTCHA, pero no se resuelve aquí: lo inyecta el interceptor del núcleo para las
 * rutas que lo exigen. Un formulario de correo abierto al público sin reto se llena de direcciones
 * falsas en un día.
 */
@Injectable()
export class AltaEnElBoletinHttpAdapter implements AltaEnElBoletinPort {
  private readonly api = inject(ApiService);

  async suscribe(correo: string): Promise<Result<AltaEnElBoletin, AppError>> {
    const respuesta = await this.api.post<{ status: string; alreadySubscribed: boolean }>(
      '/newsletter/subscribe',
      { email: correo },
    );
    return mapea(respuesta, (r) => ({ yaEstaba: !!r?.alreadySubscribed }));
  }
}
