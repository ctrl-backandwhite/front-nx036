import { CriterioDeCatalogo, EstadoDeProducto } from './producto-admin';

/**
 * La exportación de productos: la vía por la que el catálogo cruza de un entorno a otro.
 *
 * <p>Sale en el MISMO formato que acepta la importación, así que lo exportado se puede volver a
 * importar tal cual. Va por segmentos porque un catálogo entero en un solo fichero no se descarga: cada
 * ficha pesa unos 33 kB con sus ocho idiomas, variantes e imágenes.
 */

/**
 * Con qué se acota una exportación: LOS MISMOS filtros que la lista del panel, más el rango por fecha
 * de carga, que solo existe aquí.
 *
 * <p>Antes solo llevaba fecha y certificación, así que filtrar la lista a treinta productos y abrir
 * «Exportar» ofrecía los nueve mil del catálogo: lo que se descargaba no era lo que se estaba mirando,
 * y nada lo advertía.
 */
export interface FiltroDeExportacion {
  readonly creadoDesde?: string;
  readonly creadoHasta?: string;
  /** Sin valor = todos; `true` = solo certificados; `false` = solo pendientes. */
  readonly verificado?: boolean;
  readonly estado?: EstadoDeProducto;
  readonly categoriaId?: string;
  readonly texto?: string;
  /** Coste YA en yuanes, que es como lo guarda el backend; la columna del panel lo convierte al pintar. */
  readonly costeMinimo?: number;
  readonly costeMaximo?: number;
  readonly ventasMinimas?: number;
  /** De 0 a 1, como lo guarda el backend. */
  readonly tendenciaMinima?: number;
}

/**
 * El filtro de exportación que corresponde a lo que la lista está enseñando.
 *
 * <p>La página y el orden NO viajan: la exportación recorre todo lo que cumple el filtro, no la página
 * que se ve. El rango de fechas tampoco sale de aquí porque la lista no lo tiene; lo añade el diálogo.
 */
export function filtroDesdeLaLista(
  criterio: CriterioDeCatalogo,
  fechas: Pick<FiltroDeExportacion, 'creadoDesde' | 'creadoHasta'> = {},
): FiltroDeExportacion {
  return {
    creadoDesde: fechas.creadoDesde || undefined,
    creadoHasta: fechas.creadoHasta || undefined,
    verificado: criterio.verificado,
    estado: criterio.estado,
    categoriaId: criterio.categoriaId,
    texto: criterio.texto,
    costeMinimo: criterio.costeMinimo,
    costeMaximo: criterio.costeMaximo,
    ventasMinimas: criterio.ventasMinimas,
    tendenciaMinima: criterio.tendenciaMinima,
  };
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
