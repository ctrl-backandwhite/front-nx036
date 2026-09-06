import { Injectable, inject } from '@angular/core';
import { AppError } from '@shared/error/app-error';
import { Result } from '@shared/result/result';
import {
  ANUNCIOS_AL_BUS_PORT,
  AnuncioFallido,
} from '../../../domain/catalogo/port/productos-admin.port';

/**
 * Los productos certificados que no llegaron al bus del catálogo.
 *
 * <p>Que el fallo SE VEA es la razón de ser de esta consulta: como el anuncio va diferido, el error no
 * cabe en la respuesta de certificar, y sin esta lista un producto que no llegó a producción no se
 * echaría en falta hasta semanas después.
 */
@Injectable()
export class ConsultaAnunciosFallidos {
  private readonly bus = inject(ANUNCIOS_AL_BUS_PORT);

  ejecuta(): Promise<Result<readonly AnuncioFallido[], AppError>> {
    return this.bus.fallidos();
  }
}
