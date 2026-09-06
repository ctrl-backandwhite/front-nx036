import { Injectable, inject } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { ALTA_DE_CUENTA_PORT } from '../../domain/port/autenticacion.port';

/**
 * Confirmar la cuenta con el código que llega en el correo de alta, y volver a pedir ese correo.
 *
 * <p>Las dos acciones van juntas porque son la misma conversación: quien llega aquí o trae el enlace, o
 * no le llegó. Separarlas en dos casos de uso obligaría a la pantalla a inyectar dos cosas para una sola
 * pregunta.
 *
 * <p>El REENVÍO responde igual exista o no la cuenta, y por eso no distingue el fallo: si contestara
 * distinto, sería una forma de averiguar qué direcciones están registradas.
 */
@Injectable({ providedIn: 'root' })
export class ActivaCuenta {
  private readonly alta = inject(ALTA_DE_CUENTA_PORT);

  ejecuta(codigo: string): Promise<Result<void, AppError>> {
    return this.alta.activa(codigo);
  }

  reenviaElCorreo(email: string): Promise<Result<void, AppError>> {
    return this.alta.reenviaActivacion(email.trim());
  }
}
