import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';

/**
 * El código de quien recomendó la compra.
 *
 * <p>NO cambia el importe a pagar: solo atribuye la venta a quien la trajo, para que el pedido calcule su
 * comisión. Es importante tenerlo claro al pintar la pantalla — enseñarlo junto al desglose invita a
 * pensar que descuenta algo.
 *
 * <p>El identificador de visitante lo pone el adaptador: es un dato del navegador, no del negocio.
 */
export interface ReferidoPort {
  /** El código que ya venía guardado de haber llegado por un enlace, si lo hubo. */
  pendiente(): string | null;
  /** Atribuye la venta a ese código. Falso cuando el código no existe o ya no está activo. */
  aplica(codigo: string): Promise<Result<boolean, AppError>>;
}

export const REFERIDO_PORT = new InjectionToken<ReferidoPort>('ReferidoPort');
