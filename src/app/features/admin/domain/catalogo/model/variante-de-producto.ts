/**
 * Las variantes (los SKU) de un producto.
 *
 * <p>El precio que llega aquí es el CRUDO, en la divisa canónica (CNY) y sin margen: es el que se edita.
 * El de venta lo calcula el backend y se enseña en otro sitio. Mezclarlos costó una incidencia real —se
 * editaba un precio con margen y el margen se volvía a aplicar encima.
 */
export interface VarianteDeProducto {
  readonly id: string;
  readonly sku?: string;
  readonly titulo?: string;
  readonly precio?: number;
  readonly existencias: number;
  readonly urlImagen?: string;
  readonly opciones: Readonly<Record<string, string>>;
  readonly activa: boolean;
}

/** Lo que se teclea en la tabla: todo TEXTO, porque sale de campos de formulario. */
export interface BorradorDeVariante {
  readonly sku: string;
  readonly titulo: string;
  readonly precio: string;
  readonly existencias: string;
  readonly opciones: string;
  readonly urlImagen: string;
}

export const BORRADOR_DE_VARIANTE_VACIO: BorradorDeVariante = {
  sku: '',
  titulo: '',
  precio: '',
  existencias: '0',
  opciones: '',
  urlImagen: '',
};

/** Lo que se manda al guardar una variante, ya con los tipos del negocio. */
export interface CambiosDeVariante {
  readonly sku: string;
  readonly titulo: string;
  readonly precio: number | null;
  readonly existencias: number;
  readonly urlImagen: string | null;
  readonly opciones: Readonly<Record<string, string>>;
  readonly activa: boolean;
}

/** «Color:Rojo, Talla:M» ← {Color: 'Rojo', Talla: 'M'} */
export function opcionesATexto(opciones?: Readonly<Record<string, string>>): string {
  return Object.entries(opciones ?? {})
    .map(([clave, valor]) => `${clave}:${valor}`)
    .join(', ');
}

/** «Color:Rojo, Talla:M» → {Color: 'Rojo', Talla: 'M'}. Lo que no tenga dos puntos se descarta. */
export function textoAOpciones(texto: string): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const par of texto.split(',').map((p) => p.trim())) {
    const corte = par.indexOf(':');
    if (corte > 0) {
      salida[par.slice(0, corte).trim()] = par.slice(corte + 1).trim();
    }
  }
  return salida;
}

export function aBorrador(variante: VarianteDeProducto): BorradorDeVariante {
  return {
    sku: variante.sku ?? '',
    titulo: variante.titulo ?? '',
    precio: variante.precio != null ? String(variante.precio) : '',
    existencias: String(variante.existencias ?? 0),
    opciones: opcionesATexto(variante.opciones),
    urlImagen: variante.urlImagen ?? '',
  };
}

/** El título cae al SKU cuando se deja vacío: una variante sin nombre no se distingue en la tabla. */
export function desdeBorrador(borrador: BorradorDeVariante): CambiosDeVariante {
  return {
    sku: borrador.sku.trim(),
    titulo: borrador.titulo.trim() || borrador.sku.trim(),
    precio: borrador.precio ? Number(borrador.precio) : null,
    existencias: borrador.existencias ? Number(borrador.existencias) : 0,
    urlImagen: borrador.urlImagen.trim() || null,
    opciones: textoAOpciones(borrador.opciones),
    activa: true,
  };
}

/**
 * El precio de REFERENCIA de la ficha: el de la variante más barata.
 *
 * <p>Es la que fija el precio de portada («desde X»), así que las desviaciones se miden contra ella y no
 * contra el coste base: con una sola variante la desviación tiene que leerse 0 %, y contra el coste base
 * no lo hacía.
 */
export function precioDeReferencia(
  variantes: readonly VarianteDeProducto[],
  costeBase?: number,
): number {
  const base = costeBase != null ? Number(costeBase) : 0;
  const precios = variantes
    .map((variante) => (variante.precio != null ? Number(variante.precio) : base))
    .filter((precio) => precio > 0);
  return precios.length ? Math.min(...precios) : base;
}

/** Cuánto se desvía una variante de la de referencia, en tanto por ciento. */
export function desviacionDePrecio(precio: number, referencia: number): number {
  return referencia > 0 ? ((precio - referencia) / referencia) * 100 : 0;
}

/** Las que de verdad han cambiado: guardar las treinta cuando se tocó una es gastar treinta peticiones. */
export function variantesCambiadas(
  variantes: readonly VarianteDeProducto[],
  borradores: Readonly<Record<string, BorradorDeVariante>>,
): readonly VarianteDeProducto[] {
  return variantes.filter((variante) => {
    const borrador = borradores[variante.id];
    return borrador !== undefined && JSON.stringify(aBorrador(variante)) !== JSON.stringify(borrador);
  });
}
