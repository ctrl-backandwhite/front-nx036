import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { Divisa } from '../model/dinero';

/**
 * Las tasas de cambio vigentes, para poder escribir un importe en la divisa de quien mira.
 *
 * <p>Es un puerto PROPIO aunque el registro de divisas también se administre desde este mismo panel: son
 * dos capacidades distintas —consultar tasas para pintar, y administrar el registro— y quien solo pinta
 * un importe no tiene por qué poder activar una divisa. Además esta lectura va contra el endpoint
 * PÚBLICO, que es el mismo que usa la tienda, así que el panel enseña exactamente lo que ve el cliente.
 */
export interface TiposDeCambioPort {
  vigentes(): Promise<Result<readonly Divisa[], AppError>>;
}

export const TIPOS_DE_CAMBIO_PORT = new InjectionToken<TiposDeCambioPort>('TiposDeCambioPort');
