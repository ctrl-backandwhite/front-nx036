import { Injectable, inject } from '@angular/core';
import { AppError } from '@shared/error/app-error';
import { Result, exito } from '@shared/result/result';
import {
  FiltroDeExportacion,
  SegmentoDeExportacion,
  nombreDeArchivo,
  nombreDeArchivoCompleto,
} from '../../../domain/catalogo/model/exportacion';
import {
  DESCARGA_DE_ARCHIVOS_PORT,
  EXPORTACION_DE_CATALOGO_PORT,
  EXPORTACION_EN_FLUJO_PORT,
} from '../../../domain/catalogo/port/transferencia-de-catalogo.port';

/**
 * Cuántos productos entran en la exportación con el filtro puesto.
 *
 * <p>El filtro viaja al CONTADOR además de a cada descarga: los tramos que se ofrecen salen de este
 * total, y contar sin filtrar ofrecía tramos que después venían vacíos.
 */
@Injectable()
export class CuentaExportables {
  private readonly exportacion = inject(EXPORTACION_DE_CATALOGO_PORT);

  ejecuta(filtro: FiltroDeExportacion): Promise<Result<number, AppError>> {
    return this.exportacion.cuenta(filtro);
  }
}

/**
 * Descarga un tramo de productos en el MISMO formato que acepta la importación.
 *
 * <p>Que sea reimportable no es un detalle: es la vía por la que el catálogo cruza de un entorno a
 * otro.
 */
@Injectable()
export class ExportaSegmento {
  private readonly exportacion = inject(EXPORTACION_DE_CATALOGO_PORT);
  private readonly descarga = inject(DESCARGA_DE_ARCHIVOS_PORT);

  async ejecuta(
    segmento: SegmentoDeExportacion,
    filtro: FiltroDeExportacion,
    hoy: Date = new Date(),
  ): Promise<Result<number, AppError>> {
    const filas = await this.exportacion.exporta(segmento.desde, segmento.hasta, filtro);
    if (!filas.ok) {
      return filas;
    }
    this.descarga.guarda(
      nombreDeArchivo(segmento, hoy),
      JSON.stringify(filas.valor, null, 2),
      'application/json',
    );
    return exito(filas.valor.length);
  }
}

/**
 * Descarga el catálogo COMPLETO por flujo, en NDJSON.
 *
 * <p>El backend pagina y vuelca por lotes, y el navegador escribe a disco a medida que llega: la
 * respuesta nunca se acumula entera en memoria, así que escala a millones de fichas. Devuelve `false`
 * si quien lo pidió canceló el selector de archivo, que no es un fallo.
 */
@Injectable()
export class ExportaCatalogoCompleto {
  private readonly flujo = inject(EXPORTACION_EN_FLUJO_PORT);

  ejecuta(filtro: FiltroDeExportacion, hoy: Date = new Date()): Promise<Result<boolean, AppError>> {
    return this.flujo.descargaTodo(filtro, nombreDeArchivoCompleto(hoy));
  }
}
