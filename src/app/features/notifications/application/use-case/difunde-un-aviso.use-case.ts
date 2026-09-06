import { Injectable, inject } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import {
  DIFUSION_DE_AVISOS_PORT,
  Difusion,
  RespuestaDeContacto,
} from '../../domain/port/avisos.port';

/**
 * Lo que el personal de la casa ESCRIBE desde el buzón: un aviso para todo el mundo o para una cuenta, y
 * la contestación por correo a quien escribió por el formulario de contacto.
 *
 * <p>Las dos van juntas porque son la misma pantalla y el mismo permiso. Ninguna se puede lanzar en
 * blanco: mandar un aviso sin cuerpo llena la bandeja de todos con una fila vacía.
 */
@Injectable({ providedIn: 'root' })
export class DifundeUnAviso {
  private readonly difusion = inject(DIFUSION_DE_AVISOS_PORT);

  /** @returns a cuántas personas les llegó. */
  async ejecuta(aviso: Difusion): Promise<Result<number, AppError>> {
    return this.difusion.envia({
      destino: aviso.destino.trim() || 'all',
      titulo: aviso.titulo.trim(),
      cuerpo: aviso.cuerpo.trim(),
    });
  }

  async responde(respuesta: RespuestaDeContacto): Promise<Result<void, AppError>> {
    return this.difusion.responde({
      email: respuesta.email,
      asunto: respuesta.asunto.trim(),
      mensaje: respuesta.mensaje.trim(),
    });
  }
}
