import { Injectable, inject } from '@angular/core';
import { Result, fallo } from '@shared/result/result';
import { AppError, creaError } from '@shared/error/app-error';
import { ALTA_DE_CUENTA_PORT } from '../../domain/port/autenticacion.port';
import {
  BorradorDeAlta,
  FalloDelAlta,
  aSolicitudDeAlta,
  queFaltaParaElAlta,
} from '../../domain/model/alta';

/** Lo que devuelve un alta correcta: el identificador nuevo y lo que el backend quiso decir. */
export interface CuentaCreada {
  readonly idUsuario: string;
  readonly mensaje: string;
}

/**
 * Darse de alta.
 *
 * <p>Comprueba primero lo que se puede comprobar sin red —que las dos contraseñas coinciden, que la
 * contraseña es fuerte, que se aceptaron las condiciones y que el reto está resuelto— y solo entonces
 * llama. Enviar sabiendo que va a ser rechazado gasta un intento del límite por IP y devuelve un
 * mensaje mucho peor que el que se puede dar aquí.
 *
 * <p>El fallo local viaja como `AppError` con su CÓDIGO propio: la pantalla decide qué texto enseña,
 * igual que hace con los códigos que manda el servidor, sin que este caso de uso sepa de idiomas.
 */
@Injectable({ providedIn: 'root' })
export class CreaCuenta {
  private readonly alta = inject(ALTA_DE_CUENTA_PORT);

  async ejecuta(
    borrador: BorradorDeAlta,
    contrasenaSegura: boolean,
    captcha: string | null,
  ): Promise<Result<CuentaCreada, AppError>> {
    const falta: FalloDelAlta | null = queFaltaParaElAlta(borrador, contrasenaSegura, !!captcha);
    if (falta) {
      return fallo(creaError('peticion-invalida', '', { codigo: falta }));
    }
    return this.alta.registra(aSolicitudDeAlta(borrador), captcha ?? undefined);
  }
}
