import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { Pagina, ResultadoMasivo } from '../model/pagina';
import { CambiosDeUsuario, FiltroDeUsuarios, UsuarioGestionado } from '../model/usuarios';

/**
 * Administrar cuentas: buscarlas y actuar sobre una.
 *
 * <p>BORRAR UNA CUENTA ES UNA ANONIMIZACIÓN, no un borrado: el backend le quita los datos personales y
 * le pone una marca de fecha, porque los pedidos y los apuntes contables que la referencian tienen que
 * seguir existiendo. El método se llama `borra` porque es lo que quien administra cree que hace, pero
 * quien lo lea aquí ya sabe que no desaparece nada.
 */
export interface UsuariosPort {
  busca(filtro: FiltroDeUsuarios): Promise<Result<Pagina<UsuarioGestionado>, AppError>>;
  cambiaRol(id: string, rol: string): Promise<Result<void, AppError>>;
  bloquea(id: string, minutos: number): Promise<Result<void, AppError>>;
  desbloquea(id: string): Promise<Result<void, AppError>>;
  activa(id: string): Promise<Result<void, AppError>>;
  edita(id: string, cambios: CambiosDeUsuario): Promise<Result<void, AppError>>;
  reiniciaContrasena(id: string): Promise<Result<void, AppError>>;
  borra(id: string): Promise<Result<void, AppError>>;
  invita(email: string, rol?: string): Promise<Result<void, AppError>>;
}

export const USUARIOS_PORT = new InjectionToken<UsuariosPort>('UsuariosPort');

/** Las acciones sobre muchas cuentas a la vez. Es otra capacidad y por eso es otro puerto. */
export interface UsuariosEnLotePort {
  activa(ids: readonly string[]): Promise<Result<ResultadoMasivo, AppError>>;
  bloquea(ids: readonly string[]): Promise<Result<ResultadoMasivo, AppError>>;
  desbloquea(ids: readonly string[]): Promise<Result<ResultadoMasivo, AppError>>;
  cambiaRol(ids: readonly string[], rol: string): Promise<Result<ResultadoMasivo, AppError>>;
  borra(ids: readonly string[]): Promise<Result<ResultadoMasivo, AppError>>;
}

export const USUARIOS_EN_LOTE_PORT = new InjectionToken<UsuariosEnLotePort>('UsuariosEnLotePort');
