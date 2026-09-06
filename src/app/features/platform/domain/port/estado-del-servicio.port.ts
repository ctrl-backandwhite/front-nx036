import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';

/**
 * ¿Responde la plataforma?
 *
 * <p>Un método y ningún dato: la página de estado no quiere el catálogo de países de envío, quiere
 * saber si el backend contesta. Por eso no se depende del puerto de envíos del contexto de pedidos —que
 * devuelve países, regiones y formatos postales—, sino que se declara aquí lo poco que hace falta. Es
 * el mismo criterio con el que `auth` pide dos números de almacenes en vez del catálogo entero.
 *
 * <p>Devuelve `Result<void>`: lo que importa es si hubo fallo, no lo que trajo la respuesta.
 */
export interface EstadoDelServicioPort {
  comprueba(): Promise<Result<void, AppError>>;
}

export const ESTADO_DEL_SERVICIO_PORT = new InjectionToken<EstadoDelServicioPort>(
  'EstadoDelServicioPort',
);
