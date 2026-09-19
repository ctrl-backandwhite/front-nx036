import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { TokenStore } from '../../auth/token-store';
import { APP_CONFIG } from '../../config/app-config';
import { RefrescoDeSesion } from '../refresco-de-sesion';

/** Rutas de la propia autenticación: si fallan, no hay nada que renovar. */
function esLlamadaDeAutenticacion(url: string): boolean {
  return url.includes('/auth/login') || url.includes('/auth/refresh');
}

/**
 * Pone la credencial en cada petición al backend y renueva la sesión cuando caduca.
 *
 * <p>La credencial se adjunta SOLO si el destino es nuestro backend. Sin esa comprobación, el día que
 * alguien escribiera una llamada a un tercero le estaría entregando el token de quien la hace. Es el tipo
 * de fuga que no da ningún síntoma.
 *
 * <p>Ante un 401 se renueva UNA vez y se reintenta. La renovación es de vuelo único: si diez peticiones
 * caducan a la vez —lo normal al volver a una pestaña abierta— se pide un token nuevo, no diez, porque
 * cada intento invalida el anterior y la carrera acababa cerrando la sesión de quien no había hecho nada.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokens = inject(TokenStore);
  const config = inject(APP_CONFIG);
  const refresco = inject(RefrescoDeSesion);

  const esAbsoluta = /^https?:\/\//i.test(req.url);
  const esNuestroBackend = !esAbsoluta || (!!config.apiBase && req.url.startsWith(config.apiBase));

  /**
   * A las rutas de la propia autenticación NO se les pone credencial, y esto no es una optimización:
   * es lo que hace que la renovación pueda funcionar.
   *
   * <p>`/api/auth/refresh` se llama precisamente cuando el testigo de acceso acaba de caducar. Si se
   * adjunta, el servidor de recursos lo valida ANTES de llegar al controlador, lo encuentra caducado y
   * responde 401 — con el testigo de refresco intacto en el cuerpo, sin llegar a mirarlo. O sea: la
   * renovación fallaba siempre, y fallaba justo en el único momento en que se la necesita.
   *
   * <p>Medido el 19-sep-2026 con el MISMO refresco válido en el cuerpo: sin cabecera responde 200; con
   * una cabecera caducada, 401. Lo que cambia es solo la cabecera.
   *
   * <p>El síntoma que producía: la sesión se caía exactamente a la hora —lo que dura el acceso—, con
   * contraseña y con Google, y el front lo leía como «la sesión se acabó», borraba los testigos y
   * mandaba a la pantalla de acceso. En el servidor no quedaba nada útil: la respuesta es el mismo
   * `SE002` genérico que una contraseña equivocada.
   */
  const conCredencial = (peticion: HttpRequest<unknown>, token: string | null) =>
    token && esNuestroBackend && !esLlamadaDeAutenticacion(peticion.url)
      ? peticion.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : peticion;

  return next(conCredencial(req, tokens.acceso())).pipe(
    catchError((error: unknown) => {
      const caduco =
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        esNuestroBackend &&
        !esLlamadaDeAutenticacion(req.url);

      if (!caduco) {
        return throwError(() => error);
      }

      return refresco.renueva().pipe(
        switchMap((nuevo) => {
          if (!nuevo) {
            // No se ha podido renovar. Si el servidor dijo que el testigo ya no vale, la sesión ya está
            // borrada: lo decide quien conoce el motivo del fallo, no este interceptor. Aquí solo se
            // deja subir el error; a la pantalla de entrada manda el guardián de ruta.
            //
            // Borrar aquí sin mirar el motivo era lo que cerraba la sesión ante un parpadeo de red o
            // un servidor reiniciándose, con el testigo todavía bueno.
            return throwError(() => error);
          }
          return next(conCredencial(req, nuevo));
        }),
      );
    }),
  );
};
