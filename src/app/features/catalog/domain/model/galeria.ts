import { ImagenDeProducto } from './producto';

/**
 * Reglas de la galería de la ficha. Son puras: se prueban sin montar un componente.
 */

/**
 * Nº máximo de fotos que recorre el pase automático. Con galerías largas el recorrido se haría eterno
 * y quien mira acabaría viendo pasar fotos mientras intenta leer el precio.
 */
export const MAXIMO_DE_FOTOS_DEL_PASE = 8;
/** Espera inicial, para que la foto principal se aprecie antes de que empiece a cambiar. */
export const ESPERA_INICIAL_MS = 1000;
/**
 * Tiempo entre foto y foto. Tiene que ser MAYOR que el fundido (`--motion-gallery-fade`, 2 s en la
 * hoja de estilos): el cruce tarda 2 s y, si el cambio llegara antes, la foto no acabaría de aparecer
 * nunca. Con 5 s el fundido ocupa 2 s y la imagen se queda nítida los 3 restantes; a 3 s el pase se
 * percibía demasiado rápido para mirar la prenda (decisión del usuario, 5-ago-2026).
 */
export const PASO_DEL_PASE_MS = 5000;

/**
 * La clave con la que se reconoce una MISMA foto aunque venga por dos direcciones distintas.
 *
 * <p>Las imágenes de alicdn llevan un identificador `O1CN…` que es igual para la foto de galería
 * (`.jpg`) y para la miniatura de color (`.cib.jpg`). Sin esta clave, la misma imagen aparecía dos
 * veces en la tira de miniaturas. Cuando no hay identificador se cae a la dirección completa.
 */
export function claveDeImagen(direccion?: string): string {
  if (!direccion) {
    return '';
  }
  const coincidencia = /O1CN[0-9A-Za-z]+/.exec(direccion);
  return coincidencia ? coincidencia[0] : direccion;
}

/**
 * Las fotos que se enseñan: todas las del producto, sin el vídeo y sin repetidas.
 *
 * <p>El vídeo se saca porque tiene su propio botón; los duplicados, porque la misma prenda repetida
 * tres veces en la tira hace pensar que hay más fotos de las que hay.
 */
export function galeriaVisible(
  imagenes: readonly ImagenDeProducto[],
): readonly ImagenDeProducto[] {
  const vistas = new Set<string>();
  const salida: ImagenDeProducto[] = [];
  for (const imagen of imagenes) {
    if (imagen.papel === 'video') {
      continue;
    }
    const clave = claveDeImagen(imagen.direccion);
    if (clave && vistas.has(clave)) {
      continue;
    }
    if (clave) {
      vistas.add(clave);
    }
    salida.push(imagen);
  }
  return salida;
}

/** ¿Está esta foto ya en la galería? Es lo que evita duplicarla al arrastrar una foto de variante. */
export function estaEnLaGaleria(
  galeria: readonly ImagenDeProducto[],
  direccion: string,
): boolean {
  const clave = claveDeImagen(direccion);
  return galeria.some((imagen) => claveDeImagen(imagen.direccion) === clave);
}

/** Dónde está esa foto dentro de la galería, o −1 si no está. */
export function posicionEnLaGaleria(
  galeria: readonly ImagenDeProducto[],
  direccion: string,
): number {
  const clave = claveDeImagen(direccion);
  return galeria.findIndex((imagen) => claveDeImagen(imagen.direccion) === clave);
}

/**
 * Cuántos saltos da el pase automático.
 *
 * <p>Con una sola foto no hay pase: cambiar una imagen por sí misma es un parpadeo sin sentido.
 */
export function pasosDelPase(cuantasFotos: number, maximo = MAXIMO_DE_FOTOS_DEL_PASE): number {
  const pasos = Math.min(cuantasFotos, maximo);
  return pasos > 1 ? pasos : 0;
}

/** Mueve una foto de un sitio a otro y devuelve el nuevo orden de identificadores. */
export function reordena(
  galeria: readonly ImagenDeProducto[],
  desde: number,
  hasta: number,
): readonly string[] {
  const ids = galeria.map((imagen) => imagen.id);
  if (desde === hasta || desde < 0 || hasta < 0 || desde >= ids.length || hasta >= ids.length) {
    return ids;
  }
  const [movida] = ids.splice(desde, 1);
  ids.splice(hasta, 0, movida);
  return ids;
}
