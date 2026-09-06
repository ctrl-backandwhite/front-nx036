import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { Aviso, Carpeta, EstadoDeGestion } from '../model/aviso';

/**
 * LEER el buzón: la lista de una carpeta, cuántos quedan sin leer y marcar como leído.
 *
 * <p>Los puertos van partidos por CAPACIDAD y no por sujeto. La campana del escaparate solo necesita
 * este —de hecho, solo un método—: si hubiera un único `AvisosPort` con doce, cualquier doble de prueba
 * de la campana tendría que fingir los doce para comprobar un número.
 */
export interface BuzonPort {
  lista(carpeta: Carpeta): Promise<Result<readonly Aviso[], AppError>>;
  sinLeer(): Promise<Result<number, AppError>>;
  marcaLeido(id: string): Promise<Result<void, AppError>>;
  marcaTodosLeidos(): Promise<Result<void, AppError>>;
}

export const BUZON_PORT = new InjectionToken<BuzonPort>('BuzonPort');

/**
 * MOVER y gestionar: archivar, tirar, restaurar, borrar de verdad y cambiar el estado de gestión.
 *
 * <p>Separado de la lectura porque son capacidades distintas: la campana lee y no mueve nada.
 */
export interface GestionDeAvisosPort {
  archiva(id: string): Promise<Result<void, AppError>>;
  desarchiva(id: string): Promise<Result<void, AppError>>;
  aLaPapelera(id: string): Promise<Result<void, AppError>>;
  restaura(id: string): Promise<Result<void, AppError>>;
  /** Borrado definitivo: no hay vuelta atrás, por eso la pantalla lo confirma antes. */
  borraParaSiempre(id: string): Promise<Result<void, AppError>>;
  cambiaEstado(id: string, estado: EstadoDeGestion): Promise<Result<void, AppError>>;
}

export const GESTION_DE_AVISOS_PORT = new InjectionToken<GestionDeAvisosPort>(
  'GestionDeAvisosPort',
);

/** A quién va dirigida una difusión: a todo el mundo o a una cuenta concreta. */
export interface Difusion {
  readonly destino: string;
  readonly titulo: string;
  readonly cuerpo: string;
}

export interface RespuestaDeContacto {
  readonly email: string;
  readonly asunto: string;
  readonly mensaje: string;
}

/**
 * ESCRIBIR avisos: mandar uno desde el panel y contestar por correo a una petición de contacto.
 *
 * <p>Es capacidad del personal de la casa, y por eso es su propio puerto: quien monte el buzón de un
 * cliente no tiene por qué proveerlo.
 */
export interface DifusionDeAvisosPort {
  /** @returns a cuántas personas les llegó. */
  envia(difusion: Difusion): Promise<Result<number, AppError>>;
  responde(respuesta: RespuestaDeContacto): Promise<Result<void, AppError>>;
}

export const DIFUSION_DE_AVISOS_PORT = new InjectionToken<DifusionDeAvisosPort>(
  'DifusionDeAvisosPort',
);
