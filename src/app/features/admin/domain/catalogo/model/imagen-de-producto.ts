/**
 * La galería del producto y las reglas de qué foto es cuál.
 *
 * <p>Estas funciones son PURAS y viven en el dominio porque deciden cosas del negocio —si dos fotos son
 * la misma, cuál pasa a principal— y no cómo se pintan. La regla del proyecto es estricta: un color sin
 * imagen real no se carga, y la galería es solo del producto, así que distinguir una foto de variante
 * de una de galería no es un detalle de interfaz.
 */
export interface ImagenDeProducto {
  readonly id: string;
  readonly urlOrigen: string;
  readonly urlCdn?: string;
  readonly posicion: number;
  readonly papel: string;
}

/** Una foto de un valor de variación (un color) que todavía no está en la galería. */
export interface FotoDeVariante {
  readonly id: string;
  readonly url: string;
  readonly etiqueta: string;
}

/** La dirección que de verdad se pinta: la del CDN si la hay, y si no la de origen. */
export function direccionDeImagen(imagen: ImagenDeProducto): string {
  return imagen.urlCdn || imagen.urlOrigen;
}

/**
 * La identidad de una foto, para detectar duplicados.
 *
 * <p>Se usa el identificador `O1CN` de Alibaba cuando está: es el MISMO archivo aunque cambie el CDN o
 * el tamaño, así que comparar direcciones enteras metería la misma foto dos veces en la galería. Sin
 * él, la dirección sin la parte de consulta.
 */
export function claveDeImagen(url?: string | null): string {
  if (!url) {
    return '';
  }
  const o1cn = url.match(/O1CN[0-9A-Za-z]+/);
  if (o1cn) {
    return o1cn[0];
  }
  return url.split('?')[0].trim().toLowerCase();
}

/** ¿Esta dirección ya está en la galería? Se compara por identidad, no por texto. */
export function yaEnLaGaleria(galeria: readonly ImagenDeProducto[], url: string): boolean {
  const clave = claveDeImagen(url);
  return galeria.some(
    (imagen) => claveDeImagen(imagen.urlCdn) === clave || claveDeImagen(imagen.urlOrigen) === clave,
  );
}

/**
 * Todas las direcciones http(s) de un texto pegado: una por línea, o separadas por comas o espacios.
 *
 * <p>Deduplica, porque pegar una lista sacada de la ficha de origen trae repetidos con facilidad y cada
 * repetido sería una fila más en la galería.
 */
export function extraeDirecciones(texto: string): readonly string[] {
  const direcciones = texto
    .split(/[\s,]+/)
    .map((trozo) => trozo.trim())
    .filter((trozo) => /^https?:\/\//i.test(trozo));
  return Array.from(new Set(direcciones));
}

/**
 * Mueve un elemento de sitio dentro de una lista, devolviendo una lista nueva.
 *
 * <p>Es lo que hace el arrastre de la galería. Devuelve copia y no muta: el estado de la pantalla es un
 * signal, y mutar el array en su sitio no dispararía el repintado.
 */
export function mueve<T>(lista: readonly T[], desde: number, hasta: number): readonly T[] {
  if (desde === hasta || desde < 0 || hasta < 0 || desde >= lista.length || hasta >= lista.length) {
    return lista;
  }
  const copia = [...lista];
  const [movido] = copia.splice(desde, 1);
  copia.splice(hasta, 0, movido);
  return copia;
}
