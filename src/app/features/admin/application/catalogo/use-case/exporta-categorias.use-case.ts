import { Injectable, inject } from '@angular/core';
import { AppError } from '@shared/error/app-error';
import { Result, exito } from '@shared/result/result';
import { paraExportar } from '../../../domain/catalogo/model/categoria-admin';
import { nombreDeArchivoDeCategorias } from '../../../domain/catalogo/model/exportacion';
import { CATEGORIAS_ADMIN_PORT } from '../../../domain/catalogo/port/categorias-admin.port';
import { DESCARGA_DE_ARCHIVOS_PORT } from '../../../domain/catalogo/port/transferencia-de-catalogo.port';

/**
 * Descarga TODAS las categorías en el formato que acepta la importación.
 *
 * <p>El padre viaja por SLUG y no por identificador: los identificadores no sobreviven al cruzar de
 * entorno, y este fichero existe justo para eso —pasar la taxonomía de preproducción a producción.
 */
@Injectable()
export class ExportaCategorias {
  private readonly categorias = inject(CATEGORIAS_ADMIN_PORT);
  private readonly descarga = inject(DESCARGA_DE_ARCHIVOS_PORT);

  async ejecuta(hoy: Date = new Date()): Promise<Result<number, AppError>> {
    const todas = await this.categorias.listaTodas();
    if (!todas.ok) {
      return todas;
    }
    const filas = paraExportar(todas.valor);
    this.descarga.guarda(
      nombreDeArchivoDeCategorias(hoy),
      JSON.stringify(filas, null, 2),
      'application/json',
    );
    return exito(filas.length);
  }
}
