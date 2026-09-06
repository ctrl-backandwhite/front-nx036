import { Injectable, inject } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { PreferenciasService } from '@core/preferences/preferencias';
import { SesionActual } from '@core/auth/sesion-actual';
import { RESENAS_PORT } from '../../domain/port/resenas.port';

/**
 * Escribir una reseña.
 *
 * <p>El nombre lo pone la SESIÓN cuando la hay y no es editable: dejar teclearlo con la cuenta abierta
 * permitiría firmar con el nombre de otro. Solo un invitado escribe el suyo.
 *
 * <p>El idioma es el activo, no el del producto: una reseña se escribe en el idioma en el que se está
 * leyendo la tienda.
 */
@Injectable({ providedIn: 'root' })
export class PublicaResena {
  private readonly puerto = inject(RESENAS_PORT);
  private readonly sesion = inject(SesionActual);
  private readonly preferencias = inject(PreferenciasService);

  async ejecuta(
    idDelProducto: string,
    borrador: { valoracion: number; titulo: string; cuerpo: string; autor: string },
  ): Promise<Result<void, AppError>> {
    return this.puerto.publica(idDelProducto, {
      valoracion: borrador.valoracion,
      titulo: borrador.titulo.trim() || undefined,
      cuerpo: borrador.cuerpo.trim() || undefined,
      idioma: this.preferencias.idioma(),
      autor: (this.sesion.datos()?.nombreVisible || borrador.autor).trim() || undefined,
    });
  }
}
