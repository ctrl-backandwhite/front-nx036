import { InjectionToken } from '@angular/core';
import { AppError } from '@shared/error/app-error';
import { Result } from '@shared/result/result';
import { FilaDeImportacion } from '../model/importacion-masiva';
import { FiltroDeExportacion } from '../model/exportacion';

/** Lo que devuelve un lote importado: cuántos entraron, cuántos no y por qué. */
export interface ResultadoDeImportacion {
  readonly creados: number;
  readonly fallidos: number;
  readonly errores: readonly string[];
}

/** Cómo va el reindexado, que corre en segundo plano. */
export interface EstadoDeReindexado {
  readonly enMarcha: boolean;
  readonly indexados: number;
  /** Falso cuando ya había uno corriendo y por eso no se ha arrancado otro. */
  readonly arrancado?: boolean;
}

/**
 * La importación masiva: la vía por la que entran los productos y las categorías.
 *
 * <p>Hace UPSERT por identificador externo, así que reimportar un fichero exportado actualiza en vez de
 * duplicar. Es lo que permite que el catálogo cruce de un entorno a otro.
 */
export interface ImportacionDeCatalogoPort {
  importaProductos(
    filas: readonly FilaDeImportacion[],
  ): Promise<Result<ResultadoDeImportacion, AppError>>;
  importaCategorias(
    filas: readonly FilaDeImportacion[],
  ): Promise<Result<ResultadoDeImportacion, AppError>>;
  /**
   * Lanza el reindexado del catálogo en el buscador. Responde AL INSTANTE: con miles de productos,
   * hacerlo síncrono moría por el tiempo de espera del proxy y salía «no se pudo reindexar».
   */
  reindexa(): Promise<Result<EstadoDeReindexado, AppError>>;
  estadoDeReindexado(): Promise<Result<EstadoDeReindexado, AppError>>;
}

export const IMPORTACION_DE_CATALOGO_PORT = new InjectionToken<ImportacionDeCatalogoPort>(
  'ImportacionDeCatalogoPort',
);

/**
 * La exportación, en el MISMO formato que acepta la importación.
 *
 * <p>`exportaProducto` devuelve UNA ficha entera: es lo que carga el editor de producto en bloque, y lo
 * que se vuelve a mandar por la importación para reemplazarla.
 */
export interface ExportacionDeCatalogoPort {
  cuenta(filtro: FiltroDeExportacion): Promise<Result<number, AppError>>;
  exporta(
    desde: number,
    hasta: number,
    filtro: FiltroDeExportacion,
  ): Promise<Result<readonly FilaDeImportacion[], AppError>>;
  exportaProducto(id: string): Promise<Result<FilaDeImportacion, AppError>>;
}

export const EXPORTACION_DE_CATALOGO_PORT = new InjectionToken<ExportacionDeCatalogoPort>(
  'ExportacionDeCatalogoPort',
);

/**
 * Un archivo elegido por quien administra.
 *
 * <p>`fuente` es el objeto que dio el navegador y viaja OPACO a propósito: el dominio no conoce `File`
 * —no existe al prerenderizar— y solo el adaptador sabe abrirlo. Así el caso de uso se puede probar sin
 * un navegador delante.
 */
export interface ArchivoLocal {
  readonly nombre: string;
  readonly tamano: number;
  readonly fuente: unknown;
}

/**
 * Leer un archivo del disco de quien administra.
 *
 * <p>El NDJSON se recorre POR LÍNEAS y nunca se carga entero: los volcados del catálogo pasan del giga,
 * y `JSON.parse` sobre todo el fichero tumbaba la pestaña. El adaptador entrega lotes y va diciendo
 * cuántos bytes lleva leídos, que es de donde sale el porcentaje.
 */
export interface LectorDeArchivosPort {
  leeTexto(archivo: ArchivoLocal): Promise<Result<string, AppError>>;
  recorreNdjson(
    archivo: ArchivoLocal,
    filasPorLote: number,
    alLote: (filas: readonly FilaDeImportacion[], bytesLeidos: number) => Promise<void>,
  ): Promise<Result<number, AppError>>;
}

export const LECTOR_DE_ARCHIVOS_PORT = new InjectionToken<LectorDeArchivosPort>(
  'LectorDeArchivosPort',
);

/**
 * La descarga del catálogo COMPLETO, por flujo.
 *
 * <p>El backend pagina y vuelca por lotes en NDJSON, y aquí se escribe a disco sin acumularlo en
 * memoria. Devuelve si de verdad se descargó: quien cancela el selector de archivo no ha fallado.
 */
export interface ExportacionEnFlujoPort {
  descargaTodo(filtro: FiltroDeExportacion, nombre: string): Promise<Result<boolean, AppError>>;
}

export const EXPORTACION_EN_FLUJO_PORT = new InjectionToken<ExportacionEnFlujoPort>(
  'ExportacionEnFlujoPort',
);

/**
 * Entregar un fichero a quien mira.
 *
 * <p>Es un PUERTO y no una función suelta porque descargar toca el navegador —crear un enlace, pedir
 * dónde guardar, volcar por trozos—, y eso no puede vivir en un caso de uso: dejaría la exportación sin
 * poder probarse sin un DOM.
 */
export interface DescargaDeArchivosPort {
  /** Guarda un contenido ya construido con el nombre dado. */
  guarda(nombre: string, contenido: string, tipo: string): void;
}

export const DESCARGA_DE_ARCHIVOS_PORT = new InjectionToken<DescargaDeArchivosPort>(
  'DescargaDeArchivosPort',
);
