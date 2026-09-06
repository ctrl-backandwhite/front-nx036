import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';

/**
 * El saldo del monedero, visto por el pago.
 *
 * <p>Se declara aquí y no se importa el de la cartera porque lo que el pago necesita son DOS datos para
 * decidir si puede cobrar: cuánto hay disponible y cómo se escribe. Ni movimientos, ni recargas, ni
 * retenciones.
 *
 * <p>El disponible llega en céntimos de DÓLAR, la misma unidad que el total del pedido. Es lo único que
 * permite compararlos sin convertir en el navegador.
 */
export interface SaldoDeCartera {
  readonly disponibleCentimosUsd: number;
  readonly disponibleFormateado?: string;
}

export interface CarteraPort {
  saldo(): Promise<Result<SaldoDeCartera, AppError>>;
}

export const CARTERA_PORT = new InjectionToken<CarteraPort>('CarteraPort');
