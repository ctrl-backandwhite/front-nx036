import { Injectable } from '@angular/core';
import { esNavegador } from '@core/platform/plataforma';
import { DestinoTrasAccesoPort } from '../domain/port/destino-tras-acceso.port';

/** La clave con la que se apunta. Es la MISMA que escribe la pantalla de acceso antes de saltar. */
const CLAVE = 'nx-login-from';

/**
 * El destino pretendido, guardado en el almacenamiento de SESIÓN del navegador.
 *
 * <p>De sesión y no permanente a propósito: tiene que morir al cerrar la pestaña. Un destino guardado
 * para siempre reaparecería semanas después, en un acceso que no lo pidió.
 *
 * <p>Cada acceso va dentro de un `try`. En navegación privada, o con el almacenamiento bloqueado en los
 * ajustes, hasta LEER lanza; y al prerenderizar no existe siquiera. Sin esta protección, la excepción
 * reventaba el retorno del acceso justo antes del salto final.
 */
@Injectable()
export class DestinoTrasAccesoSesionAdapter implements DestinoTrasAccesoPort {
  private readonly disponible = esNavegador();

  recuerda(destino: string): void {
    if (!this.disponible) {
      return;
    }
    try {
      sessionStorage.setItem(CLAVE, destino);
    } catch {
      /* Almacenamiento bloqueado: se volverá al destino por defecto según el papel. */
    }
  }

  recoge(): string | null {
    if (!this.disponible) {
      return null;
    }
    try {
      const guardado = sessionStorage.getItem(CLAVE);
      sessionStorage.removeItem(CLAVE);
      return guardado;
    } catch {
      return null;
    }
  }
}
