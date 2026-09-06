import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { Factura, Periodo, Plan, Suscripcion } from '../model/plan';
import { FicheroDescargable } from './descarga.port';

/** El catálogo de planes y la suscripción vigente. */
export interface PlanesPort {
  lista(): Promise<Result<readonly Plan[], AppError>>;
  /** Nulo cuando la cuenta no tiene ninguna suscripción; no es un error. */
  suscripcionActual(): Promise<Result<Suscripcion | null, AppError>>;
  /** Contrata cobrando con la tarjeta guardada por defecto. Devuelve el estado que dio el servidor. */
  contrata(codigoDePlan: string, periodo: Periodo): Promise<Result<string, AppError>>;
  cancela(): Promise<Result<void, AppError>>;
}

export const PLANES_PORT = new InjectionToken<PlanesPort>('PlanesPort');

/** El historial de facturas del plan. Se separa porque quien pinta la parrilla no las necesita. */
export interface FacturasPort {
  lista(): Promise<Result<readonly Factura[], AppError>>;
  descarga(numero: string): Promise<Result<FicheroDescargable, AppError>>;
}

export const FACTURAS_PORT = new InjectionToken<FacturasPort>('FacturasPort');
