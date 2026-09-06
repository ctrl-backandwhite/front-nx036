import { nombreDePais } from '@ds/component/pais/paises';

/**
 * El nombre presentable de una ubicación del transportista.
 *
 * <p>Llega en tres formas: un código de país suelto («NL»), «ciudad, país» («Utrecht, NL») o texto
 * libre. Solo se traduce la parte que es un código; lo demás se deja tal cual, porque el nombre de la
 * ciudad lo escribe el transportista y no hay catálogo con el que contrastarlo.
 *
 * <p>PIEZA PROVISIONAL: es candidata a `shared/` en cuanto otro contexto la necesite. Se deja aquí para
 * no tocar una capa compartida mientras hay varios equipos trabajando a la vez.
 */
export function nombreDeUbicacion(ubicacion?: string): string {
  if (!ubicacion) {
    return '';
  }
  const texto = ubicacion.trim();
  if (/^[A-Za-z]{2}$/.test(texto)) {
    return nombreDePais(texto.toUpperCase());
  }
  const partes = /^(.*),\s*([A-Za-z]{2})$/.exec(texto);
  return partes ? `${partes[1].trim()}, ${nombreDePais(partes[2].toUpperCase())}` : ubicacion;
}
