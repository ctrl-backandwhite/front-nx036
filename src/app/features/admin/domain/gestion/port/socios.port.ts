import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import {
  AltaDeClienteOauth, AplicacionDeSocio, ClienteOauth, EntregaDeWebhook, SecretoEmitido,
} from '../model/socios';

/**
 * Los socios de integración.
 *
 * <p>`crea` y `rotaSecreto` devuelven el SECRETO: es la única vez que existe fuera del backend. Quien
 * llame a estos métodos tiene que enseñarlo en ese mismo momento, porque no hay forma de recuperarlo
 * después — solo de emitir otro, que invalida el anterior.
 */
export interface SociosPort {
  clientes(): Promise<Result<readonly ClienteOauth[], AppError>>;
  aplicaciones(): Promise<Result<readonly AplicacionDeSocio[], AppError>>;
  entregas(): Promise<Result<readonly EntregaDeWebhook[], AppError>>;
  crea(alta: AltaDeClienteOauth): Promise<Result<SecretoEmitido, AppError>>;
  rotaSecreto(identificador: string): Promise<Result<SecretoEmitido, AppError>>;
  borra(identificador: string): Promise<Result<void, AppError>>;
  /** Dispara un webhook de prueba a las aplicaciones activas. Devuelve cuántos se encolaron. */
  pruebaWebhooks(): Promise<Result<number, AppError>>;
}

export const SOCIOS_PORT = new InjectionToken<SociosPort>('SociosPort');
