import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';

/**
 * Recuperar el acceso cuando ya no se recuerda la contraseña.
 *
 * <p>Es OTRA capacidad distinta de entrar y de darse de alta, y por eso es otro puerto: quien prueba la
 * pantalla de acceso no tiene por qué fingir también el restablecimiento.
 *
 * <p>Las dos operaciones responden SIEMPRE lo mismo exista o no la cuenta. Si distinguieran, pedir un
 * enlace de restablecimiento sería una forma cómoda de averiguar qué direcciones están registradas.
 */
export interface RestableceContrasenaPort {
  /** Pide el correo con el enlace. La respuesta es neutra a propósito. */
  solicita(email: string): Promise<Result<void, AppError>>;
  /** Fija la contraseña nueva con el testigo que viajaba en el enlace del correo. */
  confirma(testigo: string, contrasenaNueva: string): Promise<Result<void, AppError>>;
}

export const RESTABLECE_CONTRASENA_PORT = new InjectionToken<RestableceContrasenaPort>(
  'RestableceContrasenaPort',
);
