import { LineaDeCarrito, ReferenciaDeLinea, esLaMismaLinea } from './linea-de-carrito';

/**
 * El PEDIDO MÍNIMO (MOQ) del proveedor, aplicado a la cesta.
 *
 * <p>La regla, que costó incidencias reales: el mínimo se cumple con la SUMA de todas las variantes del
 * mismo producto —tres tallas M y dos L cumplen un mínimo de cinco—, así que el control es por PRODUCTO
 * y NUNCA línea a línea. Contarlo por línea bloquea compras que el proveedor sirve sin problema; no
 * controlarlo deja llegar al pago —y cobrar— un pedido que el proveedor no acepta.
 *
 * <p>Vive en el dominio porque estaba copiado en tres pantallas del front anterior (la cesta, el cajón y
 * el pago) y las tres tenían que decidir igual. Aquí se decide una vez y las tres preguntan.
 */

/** Unidades de ESE producto en la cesta, sumando todas sus variantes. */
export function unidadesDelProducto(lista: readonly LineaDeCarrito[], productId: string): number {
  return lista
    .filter((linea) => linea.productId === productId)
    .reduce((suma, linea) => suma + linea.cantidad, 0);
}

/** El mínimo del producto. Nunca menos de uno: un mínimo de cero no significa nada. */
export function minimoDelProducto(lista: readonly LineaDeCarrito[], productId: string): number {
  const linea = lista.find((l) => l.productId === productId);
  return Math.max(1, linea?.pedidoMinimo ?? 1);
}

/** Qué se puede hacer con la línea, y por qué no cuando no se puede. */
export type Veredicto =
  /** Adelante. */
  | { readonly permitido: true }
  /**
   * Dejaría el producto por debajo de su mínimo sin llegar a cero. `minimo` es el número que hay que
   * decirle a quien compra, y `salida` indica si se le puede ofrecer hacerlo con el producto entero.
   */
  | { readonly permitido: false; readonly minimo: number; readonly hayProductoEntero: boolean };

const ADELANTE: Veredicto = { permitido: true };

/**
 * ¿Se puede bajar una unidad de esta línea?
 *
 * <p>Llegar a cero SIEMPRE vale —quitarlo del todo es un carrito válido—; lo que no vale es quedarse
 * entre uno y el mínimo, que es un pedido que el proveedor no sirve.
 */
export function puedeBajarUnaUnidad(
  lista: readonly LineaDeCarrito[],
  referencia: ReferenciaDeLinea,
): Veredicto {
  const minimo = minimoDelProducto(lista, referencia.productId);
  const restantes = unidadesDelProducto(lista, referencia.productId) - 1;
  return restantes > 0 && restantes < minimo
    ? { permitido: false, minimo, hayProductoEntero: false }
    : ADELANTE;
}

/**
 * ¿Se puede sacar la línea entera de la cesta (quitándola o apartándola)?
 *
 * <p>Cuando no se puede se ofrece hacerlo con el producto completo. Sin esa salida, un producto con dos
 * líneas quedaría ATRAPADO en la cesta: cada una dejaría a la otra por debajo del mínimo y ninguna de
 * las dos se podría sacar.
 */
export function puedeSacarLaLinea(
  lista: readonly LineaDeCarrito[],
  referencia: ReferenciaDeLinea,
): Veredicto {
  const linea = lista.find((l) => esLaMismaLinea(l, referencia));
  if (!linea) {
    return ADELANTE;
  }
  const minimo = minimoDelProducto(lista, referencia.productId);
  const restantes = unidadesDelProducto(lista, referencia.productId) - linea.cantidad;
  return restantes > 0 && restantes < minimo
    ? { permitido: false, minimo, hayProductoEntero: true }
    : ADELANTE;
}

/** Todas las líneas de un producto: es lo que se saca cuando se acepta la salida del aviso. */
export function lineasDelProducto(
  lista: readonly LineaDeCarrito[],
  productId: string,
): LineaDeCarrito[] {
  return lista.filter((linea) => linea.productId === productId);
}
