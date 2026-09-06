/**
 * La exportación de productos: la vía por la que el catálogo cruza de un entorno a otro.
 *
 * <p>Sale en el MISMO formato que acepta la importación, así que lo exportado se puede volver a
 * importar tal cual. Va por segmentos porque un catálogo entero en un solo fichero no se descarga: cada
 * ficha pesa unos 33 kB con sus ocho idiomas, variantes e imágenes.
 */
export interface FiltroDeExportacion {
  readonly creadoDesde?: string;
  readonly creadoHasta?: string;
  /** Sin valor = todos; `true` = solo certificados; `false` = solo pendientes. */
  readonly verificado?: boolean;
}

export interface SegmentoDeExportacion {
  readonly desde: number;
  readonly hasta: number;
}

/**
 * Los tramos que se ofrecen, en base 1 (1-1000, 1001-2000, …).
 *
 * <p>Se calculan sobre el total YA FILTRADO: contar sin filtrar ofrecía tramos que después venían
 * vacíos, y quien los descargaba creía haber perdido productos.
 */
export function segmentos(total: number, tamano: number): readonly SegmentoDeExportacion[] {
  const paso = Math.max(1, Math.trunc(tamano) || 1);
  const salida: SegmentoDeExportacion[] = [];
  for (let desde = 1; desde <= total; desde += paso) {
    salida.push({ desde, hasta: Math.min(desde + paso - 1, total) });
  }
  return salida;
}

/** Cuántos productos trae un tramo. */
export function tamanoDelSegmento(segmento: SegmentoDeExportacion): number {
  return segmento.hasta - segmento.desde + 1;
}

/** El nombre del fichero lleva el tramo y la fecha: dos descargas del mismo día no se pisan. */
export function nombreDeArchivo(segmento: SegmentoDeExportacion, hoy: Date): string {
  return `productos_${segmento.desde}-${segmento.hasta}_${hoy.toISOString().slice(0, 10)}.json`;
}

/** El nombre del volcado completo, que va en NDJSON porque se escribe por líneas y sin acumularlo. */
export function nombreDeArchivoCompleto(hoy: Date): string {
  return `productos_todos_${hoy.toISOString().slice(0, 10)}.ndjson`;
}

/** El nombre del fichero de categorías, con su fecha. */
export function nombreDeArchivoDeCategorias(hoy: Date): string {
  return `categorias-${hoy.toISOString().slice(0, 10)}.json`;
}
