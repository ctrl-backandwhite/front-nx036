import { Rol } from './usuario';

/**
 * Las reglas del RETORNO del acceso con Google o GitHub. Son puras y viven aquí, no en la pantalla:
 * cada una nació de un fallo real y conviene poder probarlas sin montar un navegador.
 */

/** Dónde se deja apuntado adónde quería ir quien salta al proveedor. */
export const CLAVE_DESTINO_TRAS_ACCESO = 'nx-login-from';

/**
 * ¿Tiene forma de credencial firmada (cabecera.contenido.firma)?
 *
 * <p>El backend devuelve los testigos en el FRAGMENTO de la dirección, que no viaja al servidor. Eso
 * significa que cualquiera puede escribir `/auth/callback#token=loquesea` y hacer que la aplicación lo
 * guarde: comprobar la forma es lo que impide sembrar basura —o el testigo de otra sesión— en el
 * almacenamiento del navegador.
 */
export function pareceCredencial(valor: string | null): valor is string {
  return !!valor && /^[\w-]+\.[\w-]+\.[\w-]+$/.test(valor);
}

/**
 * A qué ruta interna es seguro volver.
 *
 * <p>Solo rutas de este sitio: `//otra-web.com` es una dirección ABSOLUTA disfrazada de relativa, y
 * aceptarla convertiría el retorno del acceso en un redirector abierto. Y nunca al propio acceso, que
 * dejaría a quien acaba de entrar dando vueltas en la pantalla de la que venía.
 */
export function destinoSeguro(guardado: string | null): string | null {
  return guardado && guardado.startsWith('/') && !guardado.startsWith('//') && guardado !== '/login'
    ? guardado
    : null;
}

/**
 * Adónde va quien acaba de entrar cuando no había destino guardado.
 *
 * <p>Al personal de la casa se le deja en el panel, que es donde trabaja; a quien compra, en la portada.
 */
export function destinoPorDefecto(rol: Rol | undefined): string {
  return rol === 'ADMIN' || rol === 'OPERATOR' ? '/admin' : '/';
}
