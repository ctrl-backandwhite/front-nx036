import { LineaDeCarrito, normalizaVariante } from './linea-de-carrito';

/**
 * Lo que vale la cesta HOY, según el servidor.
 *
 * <p>La cesta congela el precio al añadir; el servidor lo recotiza con el margen y el cambio del día, que
 * es EXACTAMENTE lo que se factura. Sin recotizar, la cesta enseñaba 3,08 € y el pago cobraba 6,18 €.
 *
 * <p>REGLA DEL PROYECTO: los importes llegan YA FORMATEADOS por el backend. Aquí no hay números que
 * multiplicar ni divisas que convertir; el front pinta la cadena que le dan.
 */
export interface LineaCotizada {
  readonly productId: string;
  readonly variantId?: string;
  /** «28,26 €», ya escrito por el backend en la divisa activa. */
  readonly unitarioFormateado?: string;
  readonly totalDeLineaFormateado?: string;
  /**
   * Peso NETO de la variante en gramos: lo que pesa el artículo, no lo que factura el transportista.
   * Nulo cuando la ficha de origen no lo declara — y entonces se dice, no se rellena con un inventado.
   */
  readonly pesoGramos?: number | null;
}

export interface CotizacionDeCarrito {
  readonly lineas: readonly LineaCotizada[];
  readonly subtotalFormateado?: string;
  /** Suma del peso de las líneas que SÍ lo declaran, por cantidad. */
  readonly pesoTotalGramos?: number;
  /** Alguna línea no tiene peso real: el total se enseña como «desde X». */
  readonly pesoIncompleto?: boolean;
}

/** Lo que se manda a cotizar: ni títulos ni precios, solo qué y cuánto. */
export interface ItemACotizar {
  readonly productId: string;
  readonly variantId?: string;
  readonly cantidad: number;
}

export function aItemsACotizar(lineas: readonly LineaDeCarrito[]): ItemACotizar[] {
  return lineas.map((linea) => ({
    productId: linea.productId,
    variantId: linea.variantId,
    cantidad: linea.cantidad,
  }));
}

/**
 * La firma del contenido de la cesta: cambia si cambia algún producto, variante o cantidad, y NO cambia
 * al repintar. Es lo que evita pedir otra cotización por cada repintado.
 */
export function firmaDeLaCesta(lineas: readonly LineaDeCarrito[]): string {
  return lineas
    .map((l) => `${l.productId}:${normalizaVariante(l.variantId) ?? ''}:${l.cantidad}`)
    .join(',');
}

/** La cotización de esa línea, o nada si el servidor no la devolvió. */
export function cotizacionDeLinea(
  cotizacion: CotizacionDeCarrito | undefined,
  linea: LineaDeCarrito,
): LineaCotizada | undefined {
  return cotizacion?.lineas.find(
    (item) =>
      item.productId === linea.productId &&
      normalizaVariante(item.variantId) === normalizaVariante(linea.variantId),
  );
}

/**
 * Gramos legibles: «320 g» hasta el kilo, «1,2 kg» por encima.
 *
 * <p>El separador decimal sigue al IDIOMA elegido y no al del navegador: «1.2 kg» en una pantalla en
 * español se lee como mil doscientos.
 *
 * <p>Es la única cifra que el front compone, y no es dinero: es el peso que declara la ficha.
 */
export function formateaPeso(gramos: number, idioma = 'es'): string {
  if (gramos < 1000) {
    return `${gramos} g`;
  }
  return `${(gramos / 1000).toLocaleString(idioma, { maximumFractionDigits: 1 })} kg`;
}
