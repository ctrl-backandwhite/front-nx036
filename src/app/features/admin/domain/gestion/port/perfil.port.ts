import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { Usuario } from '@features/auth/domain/model/usuario';
import { AltaDeSegundoFactor, CambiosDePerfil, SesionAbierta } from '../model/perfil';

/**
 * Los datos de la propia cuenta y su contraseña.
 *
 * <p>`lee` existe porque la ficha de perfil enseña MÁS de lo que publica la sesión: el correo, la
 * empresa, el idioma preferido y la fecha de alta. El núcleo publica el HECHO de quién mira —lo mínimo
 * que necesita media aplicación—, no la cuenta entera; pedirle esos cuatro campos lo convertiría en un
 * almacén de perfiles.
 */
export interface PerfilPort {
  lee(): Promise<Result<Usuario, AppError>>;
  actualiza(cambios: CambiosDePerfil): Promise<Result<Usuario, AppError>>;
  cambiaContrasena(actual: string, nueva: string): Promise<Result<void, AppError>>;
}

export const PERFIL_PORT = new InjectionToken<PerfilPort>('PerfilPort');

/**
 * El segundo factor de la propia cuenta.
 *
 * <p>El secreto sale del backend UNA vez, al darlo de alta, y no se vuelve a poder consultar. Los
 * códigos de respaldo, igual: se enseñan al verificar y quien no los guarde se queda sin la única vía de
 * entrada si pierde el teléfono.
 */
export interface SegundoFactorPort {
  estado(): Promise<Result<boolean, AppError>>;
  inicia(): Promise<Result<AltaDeSegundoFactor, AppError>>;
  verifica(codigo: string): Promise<Result<readonly string[], AppError>>;
  desactiva(contrasena: string): Promise<Result<void, AppError>>;
}

export const SEGUNDO_FACTOR_PORT = new InjectionToken<SegundoFactorPort>('SegundoFactorPort');

/** Las sesiones abiertas de la propia cuenta, para poder cerrar la de un dispositivo perdido. */
export interface SesionesPort {
  lista(): Promise<Result<readonly SesionAbierta[], AppError>>;
  revoca(id: string): Promise<Result<void, AppError>>;
}

export const SESIONES_PORT = new InjectionToken<SesionesPort>('SesionesPort');
