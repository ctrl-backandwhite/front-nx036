import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';

/**
 * El BOLETÍN por correo.
 *
 * <p>En el front de React vivía dentro del módulo de afiliados por pura vecindad de ficheros, y no tiene
 * nada que ver con las comisiones: suscribirse y darse de baja de un correo periódico es exactamente lo
 * mismo que hace el buzón —decidir qué le llega a quien mira—, así que su sitio es este contexto.
 */
export interface SuscripcionAlBoletin {
  /** Si ya estaba apuntado. El backend NO falla en ese caso: lo dice, y el texto cambia. */
  readonly yaEstaba: boolean;
}

export interface BoletinPort {
  suscribe(email: string): Promise<Result<SuscripcionAlBoletin, AppError>>;
  /** La baja va por TESTIGO, no por correo: el enlace del pie de cada envío lo trae. */
  daDeBaja(testigo: string): Promise<Result<boolean, AppError>>;
}

export const BOLETIN_PORT = new InjectionToken<BoletinPort>('BoletinPort');

/**
 * Qué correos quiere recibir quien ya tiene cuenta.
 *
 * <p>Va aparte del boletín porque es otra capacidad y otro sujeto: aquí hace falta sesión, y allí no.
 * La pantalla del perfil solo necesita esta.
 */
export interface PreferenciasDeCorreoPort {
  consulta(): Promise<Result<{ sinPublicidad: boolean }, AppError>>;
  actualiza(sinPublicidad: boolean): Promise<Result<{ sinPublicidad: boolean }, AppError>>;
}

export const PREFERENCIAS_DE_CORREO_PORT = new InjectionToken<PreferenciasDeCorreoPort>(
  'PreferenciasDeCorreoPort',
);
