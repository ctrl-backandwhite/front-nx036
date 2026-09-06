import { HttpErrorResponse } from '@angular/common/http';
import { AppError, TipoDeError, creaError } from '@shared/error/app-error';

interface CuerpoDeError {
  message?: string;
  code?: string;
  errors?: Record<string, string>;
}

function tipoSegunEstado(estado: number): TipoDeError {
  switch (estado) {
    case 0:
      return 'sin-conexion';
    case 400:
    case 422:
      return 'peticion-invalida';
    case 401:
      return 'no-autenticado';
    case 403:
      return 'sin-permiso';
    case 404:
      return 'no-encontrado';
    case 409:
      return 'conflicto';
    case 429:
      return 'demasiadas-peticiones';
    default:
      return estado >= 500 ? 'error-del-servidor' : 'desconocido';
  }
}

/**
 * Traduce un fallo de HTTP al error que entiende la aplicación.
 *
 * <p>Es la frontera: de aquí para dentro nadie vuelve a mirar un código de estado. El MENSAJE sale del
 * cuerpo de la respuesta porque lo localiza el backend con la cabecera `X-Lang`; el front no tiene
 * diccionario de errores y no debe inventarse uno, o acabaría habiendo dos textos distintos para el
 * mismo fallo según quién lo pinte.
 */
export function mapeaError(error: unknown): AppError {
  if (!(error instanceof HttpErrorResponse)) {
    return creaError('desconocido', error instanceof Error ? error.message : '');
  }

  const cuerpo = (error.error ?? {}) as CuerpoDeError;
  return creaError(tipoSegunEstado(error.status), cuerpo.message ?? '', {
    codigo: cuerpo.code,
    estado: error.status,
    porCampo: cuerpo.errors,
  });
}
