import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, share } from 'rxjs';
import { APP_CONFIG } from '../config/app-config';
import { TokenStore } from '../auth/token-store';

interface RespuestaDeRefresco {
  token: string;
  refreshToken: string;
}

/**
 * Renueva la sesión, UNA vez aunque se lo pidan a la vez varias peticiones.
 *
 * <p>El vuelo único importa de verdad: al volver a una pestaña que llevaba horas abierta caducan todas
 * las peticiones en marcha a la vez. Sin esto, cada una pediría su propia renovación, y como cada
 * renovación invalida el token de refresco anterior, la última en llegar encontraría el suyo caducado y
 * cerraría la sesión de alguien que no había hecho nada.
 */
@Injectable({ providedIn: 'root' })
export class RefrescoDeSesion {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);
  private readonly tokens = inject(TokenStore);

  private enVuelo: Observable<string | null> | null = null;

  renueva(): Observable<string | null> {
    if (this.enVuelo) {
      return this.enVuelo;
    }
    const refresco = this.tokens.refresco();
    if (!refresco) {
      return of(null);
    }

    this.enVuelo = this.http
      .post<RespuestaDeRefresco>(`${this.config.apiBase}/api/auth/refresh`, {
        refreshToken: refresco,
      })
      .pipe(
        map((r) => {
          this.tokens.guarda(r.token, r.refreshToken);
          this.enVuelo = null;
          return r.token;
        }),
        catchError(() => {
          this.tokens.limpia();
          this.enVuelo = null;
          return of(null);
        }),
        // `share` es lo que hace el vuelo único: todos los que se suscriban mientras dura reciben el
        // resultado de la MISMA petición, en vez de disparar cada uno la suya.
        share(),
      );

    return this.enVuelo;
  }
}
