import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { CaptchaService } from '../../security/captcha.service';

/**
 * Formularios públicos que un robot puede disparar en masa. Llevan prueba de trabajo.
 *
 * <p>Rutas RELATIVAS, tal como se escriben en las llamadas, sin la raíz del backend.
 */
const RUTAS_CON_CAPTCHA = [
  '/auth/register',
  '/auth/password-reset/request',
  '/auth/activate/resend',
  '/newsletter/subscribe',
  '/contact',
];

/**
 * Resuelve el CAPTCHA de los formularios públicos y adjunta la solución.
 *
 * <p>Es invisible para quien rellena el formulario: el segundo que cuesta se absorbe en el mismo botón de
 * enviar. Si el reto no se pudiera resolver, la petición sale igualmente sin cabecera y el backend la
 * rechaza con su propio mensaje — el formulario ya sabe pintar ese error, y fallar aquí en silencio sería
 * peor que fallar allí con explicación.
 *
 * <p>Si la petición ya trae `X-Altcha` no se vuelve a resolver: el registro usa un widget visible que lo
 * calcula por su cuenta.
 */
export const captchaInterceptor: HttpInterceptorFn = (req, next) => {
  const ruta = req.url.split('?')[0];
  const necesita =
    req.method === 'POST' &&
    RUTAS_CON_CAPTCHA.some((r) => ruta.endsWith(r)) &&
    !req.headers.has('X-Altcha');

  if (!necesita) {
    return next(req);
  }

  const captcha = inject(CaptchaService);
  return from(
    captcha.resuelve().catch(() => null),
  ).pipe(
    switchMap((solucion) =>
      next(solucion ? req.clone({ setHeaders: { 'X-Altcha': solucion } }) : req),
    ),
  );
};
