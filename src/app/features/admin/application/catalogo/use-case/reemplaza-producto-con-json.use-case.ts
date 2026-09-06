import { Injectable, inject } from '@angular/core';
import { AppError, creaError } from '@shared/error/app-error';
import { Result, exito, fallo } from '@shared/result/result';
import { FilaDeImportacion } from '../../../domain/catalogo/model/importacion-masiva';
import {
  EXPORTACION_DE_CATALOGO_PORT,
  IMPORTACION_DE_CATALOGO_PORT,
} from '../../../domain/catalogo/port/transferencia-de-catalogo.port';

/**
 * Carga la ficha entera de un producto en formato de importación, para editarla como JSON.
 *
 * <p>Es lo que se enseña en el editor en bloque. Trae TODO lo que el producto tiene, porque lo que se
 * mande después reemplaza la ficha completa.
 */
@Injectable()
export class ExportaProducto {
  private readonly exportacion = inject(EXPORTACION_DE_CATALOGO_PORT);

  ejecuta(id: string): Promise<Result<FilaDeImportacion, AppError>> {
    return this.exportacion.exportaProducto(id);
  }
}

/**
 * Reemplaza un producto con el JSON tecleado.
 *
 * <p>ES DESTRUCTIVO Y COMPLETO: lo que se manda pasa por la importación masiva, que hace UPSERT por
 * identificador externo, así que la ficha queda EXACTAMENTE como diga ese JSON. Lo que no venga en él
 * se pierde — no es un guardado parcial, y por eso la norma del proyecto es reenviar el JSON original
 * entero con los campos añadidos, nunca una fila mínima.
 *
 * <p>Se acepta tanto un objeto como una lista de uno: la importación espera una lista, y quien copia y
 * pega desde un export completo trae los corchetes puestos.
 */
@Injectable()
export class ReemplazaProductoConJson {
  private readonly importacion = inject(IMPORTACION_DE_CATALOGO_PORT);

  async ejecuta(texto: string): Promise<Result<number, AppError>> {
    let analizado: unknown;
    try {
      analizado = JSON.parse(texto);
    } catch (error) {
      return fallo(creaError('peticion-invalida', String((error as Error)?.message ?? '')));
    }
    const filas = (Array.isArray(analizado) ? analizado : [analizado]) as FilaDeImportacion[];
    const resultado = await this.importacion.importaProductos(filas);
    if (!resultado.ok) {
      return resultado;
    }
    if (resultado.valor.fallidos > 0) {
      // El backend acepta la petición y rechaza la fila: sin esto el editor se cerraba diciendo
      // «guardado» mientras el producto se quedaba exactamente igual.
      return fallo(creaError('peticion-invalida', resultado.valor.errores.join('\n')));
    }
    return exito(resultado.valor.creados);
  }
}
