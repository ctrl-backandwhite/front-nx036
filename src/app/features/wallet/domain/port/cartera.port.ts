import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { Cartera, PaginaDeMovimientos } from '../model/cartera';
import { OpcionesDeRecarga, Recarga } from '../model/recarga';

/** Consultar el saldo y los movimientos. Solo lectura. */
export interface CarteraPort {
  consulta(): Promise<Result<Cartera, AppError>>;
  movimientos(pagina: number, tamano: number): Promise<Result<PaginaDeMovimientos, AppError>>;
}

export const CARTERA_PORT = new InjectionToken<CarteraPort>('CarteraPort');

/** Lo que hay que enviar para abrir una recarga. El importe va en la divisa activa de la web. */
export interface PeticionDeRecarga {
  readonly metodo: Recarga['metodo'];
  readonly divisa: string;
  readonly importe: number;
  /** Solo si el método es USDT. */
  readonly cadenaCripto?: string;
}

/**
 * Meter dinero en la cartera. Es la capacidad que MUEVE dinero, y por eso va en su propio puerto: quien
 * solo pinta el saldo no debería poder disparar un cobro.
 */
export interface RecargaPort {
  opciones(divisa: string): Promise<Result<OpcionesDeRecarga, AppError>>;
  inicia(peticion: PeticionDeRecarga): Promise<Result<Recarga, AppError>>;
  /** Confirmación al volver de la pasarela (Stripe Checkout). Es lo que ACREDITA el saldo. */
  confirma(idDePago: string): Promise<Result<void, AppError>>;
  /** Captura del pago de PayPal al volver de su aprobación. */
  capturaPaypal(idDePago: string): Promise<Result<void, AppError>>;
  /** Da por bueno el cobro en los entornos sin pasarela real. */
  confirmaSimulada(idDePago: string): Promise<Result<void, AppError>>;
}

export const RECARGA_PORT = new InjectionToken<RecargaPort>('RecargaPort');
