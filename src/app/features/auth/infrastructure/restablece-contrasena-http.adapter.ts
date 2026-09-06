import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { RestableceContrasenaPort } from '../domain/port/restablece-contrasena.port';

/**
 * El restablecimiento contra nuestro backend.
 *
 * <p>La petición del enlace lleva CAPTCHA, pero no se pide aquí: lo inyecta el interceptor del núcleo
 * para las rutas que lo exigen. Resolverlo en cada adaptador que llama a una ruta protegida sería
 * repetir en cinco sitios una decisión que ya está tomada en uno.
 */
@Injectable()
export class RestableceContrasenaHttpAdapter implements RestableceContrasenaPort {
  private readonly api = inject(ApiService);

  async solicita(email: string): Promise<Result<void, AppError>> {
    return mapea(
      await this.api.post<void>('/auth/password-reset/request', { email }),
      () => undefined,
    );
  }

  async confirma(testigo: string, contrasenaNueva: string): Promise<Result<void, AppError>> {
    return mapea(
      await this.api.post<void>('/auth/password-reset/confirm', {
        token: testigo,
        newPassword: contrasenaNueva,
      }),
      () => undefined,
    );
  }
}
