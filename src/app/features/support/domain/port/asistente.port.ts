import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { RespuestaDelAsistente } from '../model/conversacion';
import { LineaDeCesta, SugerenciasDeLaCesta } from '../model/cesta';

/**
 * Preguntarle algo al asistente.
 *
 * <p>El identificador de conversación se manda y se devuelve para que el servidor pueda hilar los
 * turnos. Va nulo en el primero.
 */
export interface AsistentePort {
  pregunta(
    mensaje: string,
    idConversacion: string | null,
    idioma: string,
  ): Promise<Result<RespuestaDelAsistente, AppError>>;
}

export const ASISTENTE_PORT = new InjectionToken<AsistentePort>('AsistentePort');

/**
 * Qué conviene añadir a lo que ya se lleva.
 *
 * <p>Es un puerto PROPIO de «support» aunque hable de la cesta, y no el puerto grande del contexto de la
 * cesta: lo que el asistente necesita son tres campos por línea y una lista de sugerencias ya calculada
 * por el servidor. Con el puerto ajeno, este globo quedaría atado a cada cambio del carrito y cualquier
 * doble de prueba tendría que fingir un carrito entero.
 */
export interface SugerenciasDeCestaPort {
  consulta(
    lineas: readonly LineaDeCesta[],
    idioma: string,
  ): Promise<Result<SugerenciasDeLaCesta, AppError>>;
}

export const SUGERENCIAS_DE_CESTA_PORT = new InjectionToken<SugerenciasDeCestaPort>(
  'SugerenciasDeCestaPort',
);
