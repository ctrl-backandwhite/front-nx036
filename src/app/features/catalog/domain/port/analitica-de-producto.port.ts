import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { EstimacionDeMargen, PuntoDeHistorico } from '../model/catalogo-auxiliar';

/**
 * Los dos datos de apoyo de la ficha: cómo ha evolucionado el precio y cuánto se gana.
 *
 * <p>Van en su propio puerto porque se cargan EN DIFERIDO, solo cuando alguien despliega el bloque de
 * detalles, y porque el estimado de margen es exclusivo del administrador. Meterlos en el puerto
 * principal obligaría a toda pantalla de catálogo a arrastrarlos.
 */
export interface AnaliticaDeProductoPort {
  historicoDePrecios(idDelProducto: string, dias: number): Promise<Result<readonly PuntoDeHistorico[], AppError>>;
  estimacionDeMargen(
    idDelProducto: string,
    pais: string,
    cantidad: number,
  ): Promise<Result<EstimacionDeMargen, AppError>>;
}

export const ANALITICA_DE_PRODUCTO_PORT = new InjectionToken<AnaliticaDeProductoPort>(
  'AnaliticaDeProductoPort',
);
