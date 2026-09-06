import { Injectable, inject } from '@angular/core';
import { AppError } from '@shared/error/app-error';
import { Result, exito } from '@shared/result/result';
import { FichaDeProducto } from '../../../domain/catalogo/model/ficha-de-producto';
import {
  FICHA_DE_PRODUCTO_PORT,
  VARIANTES_PORT,
} from '../../../domain/catalogo/port/ficha-de-producto.port';

/**
 * Trae la ficha completa de un producto.
 *
 * <p>Son DOS lecturas y no una a propósito: la ficha trae los precios YA con margen —es lo que ve el
 * cliente— y la ruta de variantes los trae CRUDOS, que son los que se editan. Pegar el margen sobre un
 * precio que ya lo llevaba fue un fallo real, así que la pestaña de precios se sirve siempre de la
 * segunda.
 *
 * <p>Si las variantes fallan, la ficha se devuelve igual con las suyas: perder la pantalla entera
 * porque una lectura secundaria no responde es peor que enseñarla con el precio con margen.
 */
@Injectable()
export class ConsultaFicha {
  private readonly ficha = inject(FICHA_DE_PRODUCTO_PORT);
  private readonly variantes = inject(VARIANTES_PORT);

  async ejecuta(id: string, idioma: string): Promise<Result<FichaDeProducto, AppError>> {
    const leida = await this.ficha.consulta(id, idioma);
    if (!leida.ok) {
      return leida;
    }
    const crudas = await this.variantes.lista(id);
    return exito(crudas.ok && crudas.valor.length ? { ...leida.valor, variantes: crudas.valor } : leida.valor);
  }
}
