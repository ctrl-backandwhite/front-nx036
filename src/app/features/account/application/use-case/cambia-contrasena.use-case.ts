import { Injectable, inject } from '@angular/core';
import { Result, fallo } from '@shared/result/result';
import { AppError, creaError } from '@shared/error/app-error';
import { contrasenaCumpleLaPolitica } from '../../domain/model/perfil';
import { PERFIL_PORT } from '../../domain/port/perfil.port';

/** El motivo por el que la nueva contraseña se rechazó ANTES de salir del navegador. */
export const CONTRASENA_DEBIL = 'PROFILE_PASSWORD_WEAK';
export const CONTRASENAS_DISTINTAS = 'PROFILE_PASSWORD_MISMATCH';

/**
 * Cambia la contraseña.
 *
 * <p>Las dos comprobaciones locales —que cumple la política y que la repetición coincide— se hacen aquí
 * y no en el formulario porque son negocio: la misma regla vale para el perfil, para el alta y para el
 * restablecimiento. Quien manda sigue siendo el backend; esto solo evita un viaje condenado a fallar.
 *
 * <p>Se devuelve un CÓDIGO y no un texto: los mensajes de error los escribe el backend, y para lo que se
 * rechaza aquí el texto lo pone la pantalla desde el diccionario. Mezclar las dos cosas acabaría con dos
 * redacciones distintas del mismo fallo.
 */
@Injectable({ providedIn: 'root' })
export class CambiaContrasena {
  private readonly perfil = inject(PERFIL_PORT);

  async ejecuta(
    actual: string,
    nueva: string,
    repetida: string,
  ): Promise<Result<void, AppError>> {
    if (!contrasenaCumpleLaPolitica(nueva)) {
      return fallo(creaError('peticion-invalida', '', { codigo: CONTRASENA_DEBIL }));
    }
    if (nueva !== repetida) {
      return fallo(creaError('peticion-invalida', '', { codigo: CONTRASENAS_DISTINTAS }));
    }
    return this.perfil.cambiaContrasena({ actual, nueva });
  }
}
