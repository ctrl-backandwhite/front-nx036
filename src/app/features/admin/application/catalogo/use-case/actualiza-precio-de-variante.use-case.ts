import { Injectable, inject } from '@angular/core';
import { AppError, creaError } from '@shared/error/app-error';
import { Result, exito, fallo } from '@shared/result/result';
import { VARIANTES_PORT } from '../../../domain/catalogo/port/ficha-de-producto.port';

/**
 * Cambia el precio de UNA variante, en la divisa canónica (CNY) y sin margen.
 *
 * <p>Un precio igual al que ya tenía no se manda: la edición en sitio dispara al salir del campo, y sin
 * esta comprobación tocar y salir sin cambiar nada gastaba una escritura y un repintado.
 */
@Injectable()
export class ActualizaPrecioDeVariante {
  private readonly variantes = inject(VARIANTES_PORT);

  ejecuta(id: string, precio: number, precioActual: number): Promise<Result<boolean, AppError>> {
    if (!Number.isFinite(precio) || precio < 0) {
      return Promise.resolve(fallo(creaError('peticion-invalida')));
    }
    if (precio === precioActual) {
      return Promise.resolve(exito(false));
    }
    return this.variantes.actualizaPrecio(id, precio).then((r) => (r.ok ? exito(true) : r));
  }
}
