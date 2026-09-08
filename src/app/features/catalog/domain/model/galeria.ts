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

/**
 * La foto con la que se comparte el producto: la que sale en WhatsApp o en una red social.
 *
 * <p>Se prefiere la marcada como principal y, si no hay ninguna, la primera de la galería. Es la MISMA
 * regla que aplica la pasarela en `seo-ficha.js`, y está escrita en los dos sitios porque los dos
 * escriben la misma etiqueta: si divergieran, la vista previa cambiaría según por dónde se pidiera la
 * página, que es justo lo que nadie sabría explicar después.
 *
 * <p>Vive en el dominio y no en la pantalla porque es una regla del producto —cuál es su foto— y no
 * una decisión de cómo pintarlo. La ficha no trae `imagenPrincipal`: eso lo lleva el RESUMEN, el de las
 * cuadrículas. En la ficha hay una galería, y la principal hay que deducirla. Sin esto, la ficha
 * prerenderizada salía sin `og:image` y compartirla dejaba la vista previa sin foto — medido: las 15
 * primeras fichas que se prerenderizaron.
 */
export function fotoParaCompartir(imagenes: readonly ImagenDeProducto[]): string | undefined {
  const galeria = galeriaVisible(imagenes);
  // Sin distinguir mayúsculas: el papel viaja tal cual lo manda el backend y en esta misma estructura
  // conviven `MAIN` en mayúsculas y `video` en minúsculas. Comparar exacto funcionaría hoy y dejaría
  // de funcionar el día que el backend cambie de criterio, sin más síntoma que una foto de menos.
  const principal =
    galeria.find((imagen) => imagen.papel?.toUpperCase() === 'MAIN') ?? galeria[0];
  return principal?.direccion || undefined;
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

/**
 * Coloca las imágenes en el orden que acaba de aceptar el servidor.
 *
 * <p>Es la otra mitad de {@link reordena}: aquella dice qué orden pedir, y esta lo aplica sobre la
 * lista que ya se tiene, para no volver a pedir la ficha entera solo porque se ha arrastrado una
 * miniatura.
 *
 * <p>Lo que no venga en la lista se queda al final, conservando su orden. Es el caso del vídeo y de
 * las fotos repetidas, que la galería visible filtra y por tanto nunca viajan en el orden pedido:
 * dejarlas fuera del resultado las haría desaparecer de un producto que sí las tiene.
 */
export function enEsteOrden(
  imagenes: readonly ImagenDeProducto[],
  idsEnOrden: readonly string[],
): readonly ImagenDeProducto[] {
  const posicion = new Map(idsEnOrden.map((id, indice) => [id, indice]));
  const alFinal = idsEnOrden.length;
  return [...imagenes].sort(
    (a, b) => (posicion.get(a.id) ?? alFinal) - (posicion.get(b.id) ?? alFinal),
  );
}

