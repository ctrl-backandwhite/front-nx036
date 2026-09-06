import { Injectable, inject } from '@angular/core';
import { AppError } from '@shared/error/app-error';
import { Result, exito } from '@shared/result/result';
import { Divisa } from '../../../domain/catalogo/model/divisa';
import { TASAS_DE_CAMBIO_PORT } from '../../../domain/catalogo/port/catalogo-comun.port';

/**
 * Las tasas de cambio, solo para poder enseñar el COSTE de origen en la moneda de quien administra.
 *
 * <p>Si la lectura falla se devuelve la lista vacía y no un fallo: sin tasas los importes se enseñan en
 * su divisa de origen, que es peor pero es cierto. Dejar la tabla del catálogo en blanco por no saber
 * el cambio del yuan sería mucho peor.
 */
@Injectable()
export class ConsultaTasasDeCambio {
  private readonly tasas = inject(TASAS_DE_CAMBIO_PORT);

  async ejecuta(): Promise<Result<readonly Divisa[], AppError>> {
    const resultado = await this.tasas.listaDivisas();
    return resultado.ok ? resultado : exito([]);
  }
}
