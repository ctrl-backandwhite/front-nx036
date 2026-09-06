import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { Divisa } from '../model/dinero';
import { BorradorDeIdioma, IdiomaDeTienda } from '../model/sistema';

/** El registro de idiomas de la tienda. Es ilimitado: se pueden añadir los que haga falta. */
export interface IdiomasPort {
  lista(): Promise<Result<readonly IdiomaDeTienda[], AppError>>;
  guarda(idioma: BorradorDeIdioma): Promise<Result<void, AppError>>;
  borra(id: string): Promise<Result<void, AppError>>;
}

export const IDIOMAS_PORT = new InjectionToken<IdiomasPort>('IdiomasPort');

/**
 * El registro de divisas: tasas y qué se publica en la tienda.
 *
 * <p>`sincroniza` va a buscar las tasas fuera y devuelve cuántas cambió. Es la operación que hay que
 * hacer ANTES de activar una divisa nueva: sin tasa, la tienda anunciaría precios en dólares con otro
 * símbolo.
 */
export interface MonedasPort {
  lista(): Promise<Result<readonly Divisa[], AppError>>;
  sincroniza(): Promise<Result<number, AppError>>;
  activa(codigo: string, activa: boolean): Promise<Result<void, AppError>>;
  activaEnLote(codigos: readonly string[], activa: boolean): Promise<Result<void, AppError>>;
}

export const MONEDAS_PORT = new InjectionToken<MonedasPort>('MonedasPort');
