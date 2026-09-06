/**
 * Lo que el asistente necesita saber de la CESTA para poder sugerir: qué se lleva y qué conviene
 * añadir. Nada más.
 *
 * <p>Estos modelos son de «support» y no del contexto de la cesta a propósito. Lo que el asistente
 * quiere son tres campos por línea, no el carrito con sus precios, sus reglas de mínimos y su
 * sincronización entre dispositivos. Depender del modelo grande de otro contexto ataría el asistente a
 * cada cambio de aquel y obligaría a cualquier doble de prueba a fingir un carrito entero para
 * comprobar un globo con dos productos.
 */
export interface LineaDeCesta {
  readonly idProducto: string;
  readonly idVariante?: string;
  readonly cantidad: number;
}

/** Por qué conviene añadirlo: porque no suma arancel, o porque viaja en el bulto ya pagado. */
export type MotivoDeSugerencia = 'DUTY' | 'SHIPPING';

/**
 * Un producto que conviene añadir, con el ahorro YA calculado y escrito por el backend.
 *
 * <p>Los importes llegan formateados y no como números: el precio lo calcula el servidor, y volver a
 * componerlo aquí es exactamente cómo se llega a enseñar una cifra que no coincide con la del carrito.
 */
export interface SugerenciaParaLaCesta {
  readonly id: string;
  readonly slug: string;
  readonly titulo: string;
  readonly imagen?: string;
  readonly motivo?: MotivoDeSugerencia;
  readonly arancelExtra?: string | null;
  readonly envioExtra?: string | null;
  readonly envioSuelto?: string | null;
}

/** Cuánto sitio queda en el paquete. Es el dato que cambia la decisión, y que hoy no da nadie. */
export interface HuecoDelPaquete {
  readonly gramos: number;
  readonly otroBulto?: string | null;
}

export interface SugerenciasDeLaCesta {
  readonly items: readonly SugerenciaParaLaCesta[];
  readonly hueco: HuecoDelPaquete | null;
}

/** Cuántas unidades hay en total. Es lo que distingue «han añadido» de un simple repintado. */
export function unidadesEnLaCesta(lineas: readonly LineaDeCesta[]): number {
  return lineas.reduce((suma, linea) => suma + linea.cantidad, 0);
}

/** Las líneas que se pueden consultar: sin identificador de producto no hay nada que preguntar. */
export function lineasConsultables(lineas: readonly LineaDeCesta[]): readonly LineaDeCesta[] {
  return lineas.filter((linea) => !!linea.idProducto);
}
