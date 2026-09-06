import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { Credenciales, SesionIniciada, SolicitudDeAlta, Usuario } from '../model/usuario';

/**
 * Entrar y salir. Nada más.
 *
 * <p>Los puertos se parten por CAPACIDAD y no por sujeto: un `AutenticacionPort` con quince métodos
 * obligaría a cualquier doble de prueba a implementar los quince para usar uno. Aquí, quien solo necesita
 * comprobar la sesión no arrastra el alta ni la activación.
 */
export interface AutenticacionPort {
  entra(credenciales: Credenciales): Promise<Result<SesionIniciada, AppError>>;
  sal(): Promise<Result<void, AppError>>;
}

export const AUTENTICACION_PORT = new InjectionToken<AutenticacionPort>('AutenticacionPort');

/** Darse de alta y activar la cuenta. Es otra capacidad, y por eso es otro puerto. */
export interface AltaDeCuentaPort {
  registra(solicitud: SolicitudDeAlta, captcha?: string): Promise<Result<{ idUsuario: string; mensaje: string }, AppError>>;
  activa(codigo: string): Promise<Result<void, AppError>>;
  reenviaActivacion(email: string): Promise<Result<void, AppError>>;
}

export const ALTA_DE_CUENTA_PORT = new InjectionToken<AltaDeCuentaPort>('AltaDeCuentaPort');

/** Consultar y ajustar la cuenta de quien está dentro. */
export interface UsuarioActualPort {
  consulta(): Promise<Result<Usuario | null, AppError>>;
  actualiza(cambios: Partial<Pick<Usuario, 'nombreVisible' | 'empresa' | 'pais' | 'idioma'>>): Promise<Result<Usuario, AppError>>;
}

export const USUARIO_ACTUAL_PORT = new InjectionToken<UsuarioActualPort>('UsuarioActualPort');
