import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { Plan, Suscripcion } from '../model/facturacion';

/** Los planes de suscripción y quién los tiene contratados. */
export interface FacturacionPort {
  planes(): Promise<Result<readonly Plan[], AppError>>;
  actualizaPlan(codigo: string, plan: Plan): Promise<Result<void, AppError>>;
  suscripciones(estado?: string): Promise<Result<readonly Suscripcion[], AppError>>;
}

export const FACTURACION_PORT = new InjectionToken<FacturacionPort>('FacturacionPort');
