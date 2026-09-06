import { Injectable, inject } from '@angular/core';
import { AppError, creaError } from '@shared/error/app-error';
import { Result, exito, fallo } from '@shared/result/result';
import { FilaDeImportacion } from '../../../domain/catalogo/model/importacion-masiva';
import {
  ArchivoLocal,
  LECTOR_DE_ARCHIVOS_PORT,
} from '../../../domain/catalogo/port/transferencia-de-catalogo.port';

/**
 * Lee un archivo JSON adjunto y devuelve sus filas.
 *
 * <p>El archivo tiene PRIORIDAD sobre el cuadro de texto: quien adjunta diez mil filas no espera que se
 * importe lo que quedó pegado en la caja. Se analiza una sola vez, al adjuntarlo, para poder decir ya
 * cuántas filas trae.
 *
 * <p>Los NDJSON no pasan por aquí: se recorren por flujo sin cargarlos en memoria.
 */
@Injectable()
export class LeeArchivoDeImportacion {
  private readonly lector = inject(LECTOR_DE_ARCHIVOS_PORT);

  async ejecuta(archivo: ArchivoLocal): Promise<Result<readonly FilaDeImportacion[], AppError>> {
    const texto = await this.lector.leeTexto(archivo);
    if (!texto.ok) {
      return texto;
    }
    let analizado: unknown;
    try {
      analizado = JSON.parse(texto.valor);
    } catch (error) {
      return fallo(creaError('peticion-invalida', String((error as Error)?.message ?? '')));
    }
    if (!Array.isArray(analizado)) {
      return fallo(creaError('peticion-invalida'));
    }
    return exito(analizado as FilaDeImportacion[]);
  }
}
