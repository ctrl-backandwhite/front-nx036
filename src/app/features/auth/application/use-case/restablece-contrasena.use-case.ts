import { Service, inject } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { RESTABLECE_CONTRASENA_PORT } from '../../domain/port/restablece-contrasena.port';

/**
 * Recuperar el acceso: pedir el enlace y, con él, fijar la contraseña nueva.
 *
 * <p>Es un caso de uso con dos pasos y no dos casos de uso porque la pantalla es UNA: la misma dirección
 * enseña el formulario del correo o el de la contraseña según traiga testigo o no.
 */
@Service()
export class RestableceContrasena {
  private readonly puerto = inject(RESTABLECE_CONTRASENA_PORT);

  solicitaElEnlace(email: string): Promise<Result<void, AppError>> {
    return this.puerto.solicita(email.trim());
  }

  fijaLaNueva(testigo: string, contrasenaNueva: string): Promise<Result<void, AppError>> {
    return this.puerto.confirma(testigo, contrasenaNueva);
  }
}
