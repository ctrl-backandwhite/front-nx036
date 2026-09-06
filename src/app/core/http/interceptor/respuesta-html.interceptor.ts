import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { map } from 'rxjs';

/**
 * Convierte en error una respuesta que dice ser JSON y llega siendo HTML.
 *
 * <p>Pasa cuando el backend no está accesible y quien contesta es la pasarela: devuelve su página de
 * error, o el propio documento de la aplicación, con un 200 impecable. Sin esta comprobación, quien
 * esperaba un objeto recibe una cadena que empieza por `<!doctype`, que en JavaScript es un valor
 * perfectamente cierto, y la pantalla revienta al leer el primer campo.
 *
 * <p>Tratarlo como error deja que cada pantalla degrade a su estado vacío, que es lo que corresponde
 * cuando no hay datos.
 */
export const respuestaHtmlInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    map((evento) => {
      if (
        evento instanceof HttpResponse &&
        typeof evento.body === 'string' &&
        /^\s*<(?:!doctype|html)\b/i.test(evento.body)
      ) {
        throw new HttpErrorResponse({
          status: 502,
          statusText: 'Respuesta no JSON',
          url: req.url,
          error: { message: '' },
        });
      }
      return evento;
    }),
  );
