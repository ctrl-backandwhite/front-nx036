import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import {
  FilaDeReporte,
  PaginaDeOperaciones,
  RangoDeFechas,
  ResumenDeGanancias,
} from '../model/operador';

/**
 * Lo que ve el propio operador de sus ganancias.
 *
 * <p>Separado del reporte de administración a propósito: son dos permisos distintos en el backend —uno
 * ve lo suyo, el otro ve el de todos— y mezclarlos en un puerto haría que cualquier doble de prueba de
 * la pantalla del operador tuviera que fingir también el agregado del panel.
 */
export interface MisGananciasPort {
  resumen(rango: RangoDeFechas): Promise<Result<ResumenDeGanancias, AppError>>;
  historico(
    rango: RangoDeFechas,
    pagina: number,
    tamano: number,
  ): Promise<Result<PaginaDeOperaciones, AppError>>;
}

export const MIS_GANANCIAS_PORT = new InjectionToken<MisGananciasPort>('MisGananciasPort');

/** El agregado por operador que mira quien administra. */
export interface ReporteDeOperadoresPort {
  reporte(rango: RangoDeFechas): Promise<Result<readonly FilaDeReporte[], AppError>>;
  /** Vuelve a indexar las operaciones registradas. Es mantenimiento, no negocio. */
  reindexa(): Promise<Result<number, AppError>>;
}

export const REPORTE_DE_OPERADORES_PORT = new InjectionToken<ReporteDeOperadoresPort>(
  'ReporteDeOperadoresPort',
);
