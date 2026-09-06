import { Injectable, inject } from '@angular/core';
import { AppError } from '@shared/error/app-error';
import { Result, exito } from '@shared/result/result';
import { ClaseDeImportacion } from '../../../domain/catalogo/model/esquema-de-importacion';
import { motivoDelFallo } from '../../../domain/catalogo/model/fallo-de-lote';
import {
  BYTES_POR_LOTE,
  FILAS_POR_LOTE,
  FilaDeImportacion,
  lotes,
} from '../../../domain/catalogo/model/importacion-masiva';
import { IMPORTACION_DE_CATALOGO_PORT } from '../../../domain/catalogo/port/transferencia-de-catalogo.port';

/** Cómo va la importación: cuántas filas llevan y de cuántas. */
export interface AvanceDeImportacion {
  readonly hechas: number;
  readonly total: number;
}

/** El recuento final, con el detalle de los lotes que no entraron. */
export interface ResumenDeImportacion {
  readonly creados: number;
  readonly fallidos: number;
  readonly errores: readonly string[];
}

/**
 * Importa filas al catálogo, por lotes.
 *
 * <p>El lote se cierra por lo que OCUPA y no solo por cuántas filas lleva: una ficha exportada pesa
 * unos 33 kB —ocho idiomas, variantes y listas de imágenes—, así que cien filas pasan de tres megas y
 * el proxy las rechazaba enteras con un 413 antes de que el backend viera una sola. De ahí «19 creados,
 * 200 fallidos» al reimportar un export.
 *
 * <p>Un lote que se cae NO aborta los siguientes: se apunta el motivo con su tramo y se sigue. Lo que
 * ya entró, entró.
 */
@Injectable()
export class ImportaFilas {
  private readonly importacion = inject(IMPORTACION_DE_CATALOGO_PORT);

  async ejecuta(
    filas: readonly FilaDeImportacion[],
    clase: ClaseDeImportacion,
    alAvanzar: (avance: AvanceDeImportacion) => void = () => undefined,
  ): Promise<Result<ResumenDeImportacion, AppError>> {
    let creados = 0;
    let fallidos = 0;
    const errores: string[] = [];
    for (const lote of lotes(filas, FILAS_POR_LOTE, BYTES_POR_LOTE)) {
      const resultado =
        clase === 'products'
          ? await this.importacion.importaProductos(lote.filas)
          : await this.importacion.importaCategorias(lote.filas);
      if (resultado.ok) {
        creados += resultado.valor.creados;
        fallidos += resultado.valor.fallidos;
        errores.push(...resultado.valor.errores.map((e) => `[${lote.desde}-${lote.hasta}] ${e}`));
      } else {
        fallidos += lote.filas.length;
        const motivo = motivoDelFallo(resultado.error);
        errores.push(`[${lote.desde}-${lote.hasta}] ${motivo.mensaje ?? motivo.clave}`);
      }
      alAvanzar({ hechas: lote.hasta, total: filas.length });
    }
    return exito({ creados, fallidos, errores });
  }
}
