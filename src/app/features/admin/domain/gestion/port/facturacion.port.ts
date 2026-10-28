import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { PaginaDeSuscripciones, Plan } from '../model/facturacion';

/** Qué página de suscripciones se pide: estado (opcional), número de página y tamaño. */
export interface FiltroDeSuscripciones {
  readonly estado?: string;
  readonly pagina?: number;
  readonly tamano?: number;
}

/** Los planes de suscripción y quién los tiene contratados. */
export interface FacturacionPort {
  planes(): Promise<Result<readonly Plan[], AppError>>;
  actualizaPlan(codigo: string, plan: Plan): Promise<Result<void, AppError>>;
  suscripciones(filtro: FiltroDeSuscripciones): Promise<Result<PaginaDeSuscripciones, AppError>>;
}

export const FACTURACION_PORT = new InjectionToken<FacturacionPort>('FacturacionPort');
