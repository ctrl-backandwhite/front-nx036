import { Injectable, inject } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { RECARGA_PORT } from '../../domain/port/cartera.port';

/** De qué vuelta se trata: cada pasarela cierra su cobro de una manera distinta. */
export type ClaseDeRetorno = 'pasarela' | 'paypal';

/**
 * Dar por cobrada una recarga al volver de la pasarela.
 *
 * <p>Es lo que ACREDITA el saldo: no se depende del aviso que la pasarela manda por su cuenta, porque en
 * los entornos de prueba ese aviso no llega y el cliente se quedaba mirando una recarga que nunca subía.
 *
 * <p>Cada confirmación MUEVE dinero y solo puede lanzarse una vez por visita. El pestillo lo pone la
 * pantalla, que es quien sabe cuántas veces la han abierto; aquí solo se ejecuta lo que se pide.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmaRecarga {
  private readonly recarga = inject(RECARGA_PORT);

  ejecuta(idDePago: string, clase: ClaseDeRetorno): Promise<Result<void, AppError>> {
    return clase === 'paypal'
      ? this.recarga.capturaPaypal(idDePago)
      : this.recarga.confirma(idDePago);
  }

  /** Da por bueno el cobro en los entornos sin pasarela real. */
  simulada(idDePago: string): Promise<Result<void, AppError>> {
    return this.recarga.confirmaSimulada(idDePago);
  }
}
