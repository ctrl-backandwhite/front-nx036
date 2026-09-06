import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { ComisionesPendientes } from '../model/comisiones-pendientes';

/**
 * Las comisiones de afiliado pendientes, para explicarlas en la cartera.
 *
 * <p>¿Por qué un puerto propio de «wallet» si el panel de afiliados también sabe esto? Porque lo que la
 * cartera necesita son un total y cuatro fechas para una lista, no el panel entero con sus códigos, sus
 * clics y su perfil de cobro. Depender del puerto grande de otro contexto ataría esta pantalla a cada
 * cambio de aquel, y obligaría a cualquier doble de prueba a fingir un panel completo para pintar una
 * cuenta atrás. Es la segregación de interfaces aplicada literalmente: los dos adaptadores resuelven
 * contra el mismo endpoint y cada contexto pide lo suyo.
 */
export interface ComisionesPendientesPort {
  consulta(): Promise<Result<ComisionesPendientes, AppError>>;
}

export const COMISIONES_PENDIENTES_PORT = new InjectionToken<ComisionesPendientesPort>(
  'ComisionesPendientesPort',
);
