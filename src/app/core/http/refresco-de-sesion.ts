import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, catchError, map, of, share } from 'rxjs';
import { APP_CONFIG } from '../config/app-config';
import { TokenStore } from '../auth/token-store';

interface RespuestaDeRefresco {
  token: string;
  refreshToken: string;
}

/**
 * ¿Este fallo significa que la sesión se ha acabado, o solo que ahora mismo no se ha podido renovar?
 *
 * <p>La diferencia decide si se echa a alguien de la aplicación. Solo el backend puede decir que el
 * testigo de refresco ya no vale, y lo dice con un 401 o un 403. Todo lo demás —el móvil que pierde
 * cobertura (estado 0), un 502 mientras se despliega, un 429 por exceso de peticiones— es pasajero:
 * el testigo sigue siendo bueno y el siguiente intento funcionará.
 *
 * <p>Antes se limpiaba la sesión ante CUALQUIER error. Bastaba un parpadeo de red o un reinicio del
 * servidor para que a quien estaba navegando se le cerrara la sesión sin haber hecho nada, y sin nada
 * que mirar después: el token válido ya estaba borrado.
 */
function laSesionSeAcabo(error: unknown): boolean {
  return error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403);
}

/**
 * Renueva la sesión, UNA vez aunque se lo pidan a la vez varias peticiones.
 *
 * <p>El vuelo único importa de verdad: al volver a una pestaña que llevaba horas abierta caducan todas
 * las peticiones en marcha a la vez. Sin esto, cada una pediría su propia renovación, y como cada
 * renovación invalida el token de refresco anterior, la última en llegar encontraría el suyo caducado y
 * cerraría la sesión de alguien que no había hecho nada.
 */
@Service()
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
        catchError((error: unknown) => {
          // Solo se borra la sesión si el servidor ha dicho que el testigo no vale. Un fallo de red o
          // un servidor que se está reiniciando no son motivo para echar a nadie.
          if (laSesionSeAcabo(error)) {
            this.tokens.limpia();
          }
          this.enVuelo = null;
          return of(null);
        }),
        // `share` es lo que hace el vuelo único: todos los que se suscriban mientras dura reciben el
        // resultado de la MISMA petición, en vez de disparar cada uno la suya.
        //
        // `resetOnRefCountZero: false` es lo que impide que se CANCELE. Navegar destruye componentes y
        // Angular aborta sus peticiones en curso; si la que provocó el 401 se iba, con el ajuste por
        // defecto se llevaba por delante la renovación a medio hacer. El servidor podía haber rotado
        // ya el testigo, así que el siguiente intento llegaba con uno revocado y ahí sí se cerraba la
        // sesión: un cierre provocado por haber cambiado de página.
        share({ resetOnRefCountZero: false }),
      );

    return this.enVuelo;
  }
}
