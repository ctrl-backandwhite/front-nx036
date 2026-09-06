import { AppError } from '@shared/error/app-error';

/**
 * Por qué se cayó un lote, dicho de forma que se pueda actuar.
 *
 * <p>Antes todo fallo de red acababa en «la importación masiva falló», y con ese texto es imposible
 * saber si el problema son los datos, la sesión o el tamaño del envío. El 413 es el caso importante: el
 * lote NUNCA llegó al backend, así que no hay ni un error por fila que mirar, y la salida es partirlo.
 *
 * <p>Devuelve la clave del texto y, si el backend mandó uno redactado, ese mismo: los mensajes de error
 * los escribe el servidor y aquí no se inventa ninguno.
 */
export interface MotivoDelFallo {
  readonly clave: string;
  readonly mensaje?: string;
  readonly estado?: number;
}

export function motivoDelFallo(error: AppError): MotivoDelFallo {
  if (error.estado === 413) {
    return { clave: 'admin.catalog.bulk.err_too_large', estado: 413 };
  }
  if (error.tipo === 'no-autenticado' || error.tipo === 'sin-permiso') {
    return { clave: 'admin.catalog.bulk.err_session', estado: error.estado };
  }
  if (error.mensaje) {
    return { clave: 'admin.catalog.bulk.error', mensaje: error.mensaje, estado: error.estado };
  }
  return { clave: 'admin.catalog.bulk.error', estado: error.estado };
}
