import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { PreferenciasService } from '../../preferences/preferencias';
import { PaisDelUsuario } from '../pais-del-usuario';

/**
 * Añade a cada petición el idioma, la moneda y el país con los que el backend tiene que responder.
 *
 * <p>No son cabeceras decorativas: de la moneda salen los importes que ve quien compra, y del idioma sale
 * el texto de los errores —los mensajes se localizan en el SERVIDOR, a partir de su enumeración de
 * códigos, resueltos con `X-Lang`. El front pinta lo que llega ya traducido y no tiene diccionario de
 * errores propio.
 *
 * <p>El PAÍS es el de registro del usuario, no el de envío ni el de la dirección IP: es el que decide el
 * margen. Quien no ha entrado no lo manda, y entonces el backend lo deduce de la red o aplica la regla
 * base.
 */
export const preferenciasInterceptor: HttpInterceptorFn = (req, next) => {
  const preferencias = inject(PreferenciasService);
  const pais = inject(PaisDelUsuario);

  const idioma = preferencias.idioma();
  let cabeceras = req.headers
    .set('X-Currency', preferencias.moneda())
    .set('Accept-Language', idioma)
    .set('X-Lang', idioma);

  const paisDeRegistro = pais.codigo();
  if (paisDeRegistro) {
    cabeceras = cabeceras.set('X-Country', paisDeRegistro);
  }

  return next(req.clone({ headers: cabeceras }));
};
