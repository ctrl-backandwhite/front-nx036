/**
 * Un trozo de una lista larga, tal y como lo entiende el panel.
 *
 * <p>El backend pagina casi todos los listados de administración —usuarios, carteras, afiliados— y
 * siempre con la misma forma. Se declara UNA vez aquí para que ninguna pantalla tenga que acordarse de
 * si el total venía en `totalElements` o en `total`: eso es vocabulario del transporte y se traduce en
 * el adaptador.
 */
export interface Pagina<T> {
  readonly elementos: readonly T[];
  readonly total: number;
  readonly paginas: number;
  readonly pagina: number;
}

/** Una página vacía, para pintar mientras no hay respuesta sin llenar las plantillas de condicionales. */
export function paginaVacia<T>(): Pagina<T> {
  return { elementos: [], total: 0, paginas: 1, pagina: 0 };
}

/**
 * Lo que devuelve una acción masiva.
 *
 * <p>El backend recorre los identificadores uno a uno y NO aborta el lote cuando uno falla: una
 * transición imposible cuenta como fallo y los demás siguen. Por eso hay que enseñar las dos cifras;
 * decir solo «hecho» escondería que la mitad no se hizo.
 */
export interface ResultadoMasivo {
  readonly correctos: number;
  readonly fallidos: number;
  readonly errores: readonly string[];
}

/** Cuántas páginas hay como mínimo: nunca cero, o el paginador se quedaría sin botones. */
export function paginasAlMenosUna(paginas: number | undefined): number {
  return Math.max(1, paginas ?? 1);
}
