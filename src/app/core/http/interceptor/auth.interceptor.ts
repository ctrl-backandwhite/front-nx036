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

  const conCredencial = (peticion: HttpRequest<unknown>, token: string | null) =>
    token && esNuestroBackend
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
            // No se pudo renovar: la sesión se acabó de verdad. Se limpia y se deja que el error suba;
            // quién manda a la pantalla de entrada lo decide el guardián de ruta, no el cliente HTTP.
            tokens.limpia();
            return throwError(() => error);
          }
          return next(conCredencial(req, nuevo));
        }),
      );
    }),
  );
};
