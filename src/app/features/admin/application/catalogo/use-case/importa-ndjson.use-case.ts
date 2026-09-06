import { Injectable, inject } from '@angular/core';
import { AppError } from '@shared/error/app-error';
import { Result, exito } from '@shared/result/result';
import { motivoDelFallo } from '../../../domain/catalogo/model/fallo-de-lote';
import { FILAS_POR_LOTE, FilaDeImportacion } from '../../../domain/catalogo/model/importacion-masiva';
import {
  ArchivoLocal,
  IMPORTACION_DE_CATALOGO_PORT,
  LECTOR_DE_ARCHIVOS_PORT,
} from '../../../domain/catalogo/port/transferencia-de-catalogo.port';
import { ResumenDeImportacion } from './importa-filas.use-case';

/** Cuántos bytes van leídos del archivo y cuántos productos se han procesado. */
export interface AvanceDeNdjson {
  readonly bytes: number;
  readonly total: number;
  readonly procesados: number;
}

/** Cuántos errores se guardan como mucho: una carga de horas no puede dejar un millón de líneas de log. */
const TOPE_DE_ERRORES = 100;

/**
 * Importa un archivo NDJSON leyéndolo por FLUJO, sin cargarlo en memoria.
 *
 * <p>Es lo que permite meter millones de filas desde el navegador: se decodifica línea a línea, se
 * acumulan lotes y se mandan; la memoria no crece con el tamaño del archivo. Una línea ilegible cuenta
 * como fallo pero no tira la carga entera.
 */
@Injectable()
export class ImportaNdjson {
  private readonly lector = inject(LECTOR_DE_ARCHIVOS_PORT);
  private readonly importacion = inject(IMPORTACION_DE_CATALOGO_PORT);

  async ejecuta(
    archivo: ArchivoLocal,
    alAvanzar: (avance: AvanceDeNdjson) => void = () => undefined,
  ): Promise<Result<ResumenDeImportacion, AppError>> {
    let creados = 0;
    let fallidos = 0;
    const errores: string[] = [];

    const mandaLote = async (filas: readonly FilaDeImportacion[], bytes: number) => {
      if (filas.length) {
        const resultado = await this.importacion.importaProductos(filas);
        if (resultado.ok) {
          creados += resultado.valor.creados;
          fallidos += resultado.valor.fallidos;
          if (errores.length < TOPE_DE_ERRORES) {
            errores.push(...resultado.valor.errores);
          }
        } else {
          fallidos += filas.length;
          const motivo = motivoDelFallo(resultado.error);
          errores.push(motivo.mensaje ?? motivo.clave);
        }
      }
      alAvanzar({ bytes, total: archivo.tamano, procesados: creados + fallidos });
    };

    const leido = await this.lector.recorreNdjson(archivo, FILAS_POR_LOTE, mandaLote);
    if (!leido.ok) {
      return leido;
    }
    return exito({ creados, fallidos: fallidos + leido.valor, errores });
  }
}
