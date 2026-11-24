import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import {
  CriterioDeIncidencias,
  PaginaDeIncidencias,
} from '../model/incidencia-de-envio';

/** Consultar y cerrar las incidencias de envío. */
export interface IncidenciasDeEnvioPort {
  busca(criterio: CriterioDeIncidencias): Promise<Result<PaginaDeIncidencias, AppError>>;
  /** Cierra una incidencia dejando constancia de qué se hizo. */
  resuelve(id: string, nota: string): Promise<Result<void, AppError>>;
}

export const INCIDENCIAS_DE_ENVIO_PORT = new InjectionToken<IncidenciasDeEnvioPort>(
  'IncidenciasDeEnvioPort',
);

/** Lo que se puede hacer con la guía de un bulto desde el panel. */
export interface GuiasDeEnvioPort {
  /** La dirección de la etiqueta; el backend la genera y la rellena en el bulto si hacía falta. */
  etiqueta(pedidoId: string, secuencia: number): Promise<Result<string, AppError>>;
  anula(pedidoId: string, secuencia: number): Promise<Result<void, AppError>>;
}

export const GUIAS_DE_ENVIO_PORT = new InjectionToken<GuiasDeEnvioPort>('GuiasDeEnvioPort');
