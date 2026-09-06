import { Injectable } from '@angular/core';
import { esNavegador } from '@core/platform/plataforma';
import { MemoriaDeSesionPort } from '../domain/port/memoria-de-sesion.port';

/**
 * La memoria que dura lo que la pestaña, sobre el almacenamiento de sesión del navegador.
 *
 * <p>Cada acceso va dentro de un `try`. En navegación privada, o con el almacenamiento bloqueado en los
 * ajustes, hasta LEER lanza; y al prerenderizar no existe siquiera. Perder el hilo de la conversación es
 * una molestia; que la excepción tumbe la pantalla antes de pintar nada, no.
 */
@Injectable()
export class MemoriaDeSesionAdapter implements MemoriaDeSesionPort {
  private readonly disponible = esNavegador();

  lee(clave: string): string | null {
    if (!this.disponible) {
      return null;
    }
    try {
      return sessionStorage.getItem(clave);
    } catch {
      return null;
    }
  }

  guarda(clave: string, valor: string): void {
    if (!this.disponible) {
      return;
    }
    try {
      sessionStorage.setItem(clave, valor);
    } catch {
      /* La conversación seguirá viva en este montaje, solo que sin memoria al recargar. */
    }
  }
}
