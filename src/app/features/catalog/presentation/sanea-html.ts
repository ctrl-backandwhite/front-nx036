import DOMPurify from 'dompurify';

/**
 * Limpia el HTML que llega del PROVEEDOR antes de pintarlo.
 *
 * <p>PIEZA PROVISIONAL: su sitio es `core/`, que es donde vivirá el saneado de toda la aplicación (el
 * front anterior lo tenía en `lib/sanitize.ts`). Se deja aquí porque esa capa la está portando otro
 * equipo, y se anota para moverla.
 *
 * <p>Se usa DOMPurify y NO el saneador de Angular a propósito. La descripción de un producto es HTML
 * ajeno, escrito por un tercero al que no controlamos, y para ese caso la norma del proyecto es
 * limpiarlo con la misma herramienta en los dos frontales: si uno de los dos afloja, la diferencia se
 * descubre cuando ya hay algo dentro.
 *
 * <p>Al PRERENDERIZAR no hay `window` y la variante del navegador no funciona. Devolver el HTML sin
 * limpiar sería justo lo contrario de lo que hace falta, así que sin ventana se devuelve vacío: la
 * descripción la pinta el navegador al hidratar.
 */
export function saneaHtml(html: string | undefined): string {
  if (!html) {
    return '';
  }
  if (typeof window === 'undefined') {
    return '';
  }
  return DOMPurify.sanitize(html);
}
