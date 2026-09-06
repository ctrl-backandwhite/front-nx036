/**
 * Una línea de la cesta: qué producto, en qué variante, cuántas unidades y a qué precio se añadió.
 *
 * <p>Es un modelo de NEGOCIO, no la respuesta del backend. El adaptador traduce en la frontera; aquí se
 * habla de líneas, variantes y pedido mínimo.
 *
 * <p>El precio va CONGELADO con su divisa de origen. Congelarlo es lo que permite enseñar en la cesta lo
 * mismo que se vio en la ficha mientras el servidor recotiza; separarlo de su divisa fue lo que una vez
 * pintó «117,26 €» por algo que valía 14,90 €, así que importe y divisa viajan siempre emparejados.
 */
export interface LineaDeCarrito {
  readonly productId: string;
  readonly variantId?: string;
  /** SKU ya resuelto (el de la variante, o el base del producto). Se enseña en la cesta. */
  readonly sku?: string;
  readonly slug: string;
  readonly titulo: string;
  readonly imagen?: string;
  /** Etiqueta legible de la variante, ya compuesta: «Negro / M». */
  readonly etiquetaDeVariante?: string;
  /** Importe unitario en la divisa en que lo devolvió el catálogo. */
  readonly precioUnitarioOrigen: number;
  readonly divisaDeOrigen: string;
  readonly cantidad: number;
  /** Pedido mínimo del PRODUCTO (no de la línea). Ausente equivale a uno. */
  readonly pedidoMinimo?: number;
  /** Importe unitario tal y como se le enseñó a quien compra, en la divisa que tenía activa. */
  readonly precioUnitarioMostrado?: number;
  readonly divisaMostrada?: string;
}

/** Con qué se identifica una línea sin traerla entera: producto más variante. */
export interface ReferenciaDeLinea {
  readonly productId: string;
  readonly variantId?: string;
}

/**
 * «Sin variante» se ha escrito de tres formas distintas a lo largo del tiempo —ausente, nula y cadena
 * vacía—, y cestas antiguas guardaron la cadena vacía. Compararlas sin normalizar daba dos líneas
 * distintas para el mismo producto: se duplicaba en la cesta y se cobraba dos veces.
 */
export function normalizaVariante(valor: string | null | undefined): string | null {
  return valor == null || valor === '' ? null : valor;
}

/** ¿Son la misma línea? Mismo producto y misma variante, ya normalizada. */
export function esLaMismaLinea(linea: LineaDeCarrito, referencia: ReferenciaDeLinea): boolean {
  return (
    linea.productId === referencia.productId &&
    normalizaVariante(linea.variantId) === normalizaVariante(referencia.variantId)
  );
}

/** Una clave estable para recorrer listas en la plantilla y para firmar el contenido de la cesta. */
export function claveDeLinea(linea: ReferenciaDeLinea): string {
  return `${linea.productId}:${normalizaVariante(linea.variantId) ?? ''}`;
}

/**
 * El precio unitario congelado, con SU divisa.
 *
 * <p>Prefiere el que se le enseñó a quien compra —exactamente lo que vio en la ficha— y solo cae al de
 * origen en las líneas antiguas que no lo guardaban. Devolver los dos datos juntos es la razón de que
 * exista esta función: quien la use no puede etiquetar el importe con la divisa equivocada.
 */
export function precioCongelado(linea: LineaDeCarrito): { importe: number; divisa: string } {
  if (linea.precioUnitarioMostrado != null && linea.precioUnitarioMostrado > 0 && linea.divisaMostrada) {
    return { importe: linea.precioUnitarioMostrado, divisa: linea.divisaMostrada };
  }
  if (linea.precioUnitarioOrigen != null && linea.divisaDeOrigen) {
    return { importe: linea.precioUnitarioOrigen, divisa: linea.divisaDeOrigen };
  }
  return {
    importe: linea.precioUnitarioOrigen ?? 0,
    divisa: linea.divisaDeOrigen ?? linea.divisaMostrada ?? 'USD',
  };
}

/**
 * Mete una línea en una lista fusionándola con la que ya hubiera de la misma variante.
 *
 * <p>Suma cantidades y toma del recién llegado el precio, la divisa, el SKU y la imagen: es el dato
 * canónico y el coherente con la divisa activa. Lo comparten añadir al carrito, devolver algo desde
 * «guardado para más tarde» y apartar una línea.
 */
export function insertaOFusiona(
  lista: readonly LineaDeCarrito[],
  entrante: LineaDeCarrito,
): LineaDeCarrito[] {
  const llegada: LineaDeCarrito = {
    ...entrante,
    variantId: normalizaVariante(entrante.variantId) ?? undefined,
  };
  const salida: LineaDeCarrito[] = [];
  let absorbida = false;

  for (const linea of lista) {
    if (!esLaMismaLinea(linea, llegada)) {
      salida.push(linea);
      continue;
    }
    if (!absorbida) {
      salida.push({
        ...linea,
        ...llegada,
        sku: llegada.sku ?? linea.sku,
        imagen: llegada.imagen ?? linea.imagen,
        etiquetaDeVariante: llegada.etiquetaDeVariante ?? linea.etiquetaDeVariante,
        cantidad: linea.cantidad + llegada.cantidad,
      });
      absorbida = true;
      continue;
    }
    // Un tercer duplicado heredado: se acumula sobre el que ya se consolidó, sin perder unidades.
    const ultima = salida[salida.length - 1];
    salida[salida.length - 1] = { ...ultima, cantidad: ultima.cantidad + linea.cantidad };
  }

  if (!absorbida) {
    salida.push(llegada);
  }
  return salida;
}

/**
 * Deja la línea en la lista si no estaba. NO suma: si la escritura sí llegó al servidor y solo se perdió
 * la respuesta, la línea ya viene en la cesta releída y duplicarla doblaría el pedido.
 */
export function aseguraLinea(
  lista: readonly LineaDeCarrito[],
  linea: LineaDeCarrito,
): LineaDeCarrito[] {
  return lista.some((l) => esLaMismaLinea(l, linea)) ? [...lista] : [...lista, linea];
}

/** La lista sin esa línea. */
export function sinLinea(
  lista: readonly LineaDeCarrito[],
  referencia: ReferenciaDeLinea,
): LineaDeCarrito[] {
  return lista.filter((l) => !esLaMismaLinea(l, referencia));
}

/**
 * Colapsa duplicados heredados de migraciones de divisa antiguas.
 *
 * <p>El mismo producto llegó a aparecer dos veces con precios de monedas distintas —una en yuanes sin
 * convertir y otra ya en euros—, y el subtotal salía incongruente. Se conserva la línea canónica (la que
 * declara divisa de origen y, en empate, la de importe mayor) y se SUMAN las cantidades para no perder
 * unidades que alguien había pedido.
 */
export function deduplica(lista: readonly LineaDeCarrito[]): LineaDeCarrito[] {
  const salida: LineaDeCarrito[] = [];
  for (const linea of lista) {
    const indice = salida.findIndex((x) => esLaMismaLinea(x, linea));
    if (indice < 0) {
      salida.push(linea);
    } else {
      salida[indice] = funde(salida[indice], linea);
    }
  }
  return salida;
}

/** Cuál de las dos manda: la que declara divisa de origen y, en empate, la de importe mayor. */
function funde(previa: LineaDeCarrito, entrante: LineaDeCarrito): LineaDeCarrito {
  const ganaLaEntrante =
    !!entrante.divisaDeOrigen &&
    (!previa.divisaDeOrigen || (entrante.precioUnitarioOrigen ?? 0) >= (previa.precioUnitarioOrigen ?? 0));
  const canonica = ganaLaEntrante ? entrante : previa;
  const otra = ganaLaEntrante ? previa : entrante;
  return {
    ...previa,
    ...canonica,
    sku: canonica.sku ?? otra.sku,
    imagen: canonica.imagen ?? otra.imagen,
    etiquetaDeVariante: canonica.etiquetaDeVariante ?? otra.etiquetaDeVariante,
    cantidad: previa.cantidad + entrante.cantidad,
  };
}

/** Cuántas unidades hay en total. Es lo que enseña la insignia del icono de la cesta. */
export function unidadesTotales(lista: readonly LineaDeCarrito[]): number {
  return lista.reduce((suma, linea) => suma + linea.cantidad, 0);
}

/**
 * El SKU con el que se identifica la fila, siempre.
 *
 * <p>Sin él la fila se queda sin identificador y quien reclama un pedido no puede decir de qué habla, así
 * que se cae al identificador de variante recortado y, en último término, al del producto.
 */
export function skuVisible(linea: LineaDeCarrito): string {
  if (linea.sku && linea.sku.trim() !== '') {
    return linea.sku;
  }
  return (linea.variantId ?? linea.productId).slice(0, 8);
}
