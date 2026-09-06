import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';

/**
 * Apuntar el clic de un referido y atarlo después a la cuenta.
 *
 * <p>Puerto aparte del panel a propósito: esto lo usa CUALQUIER visita anónima que llegue por un enlace,
 * mientras que el panel solo lo abre un afiliado. Juntarlos obligaría a cargar el panel entero —y su
 * doble en las pruebas— para algo que ocurre en la portada.
 */
export interface AtribucionDeReferidoPort {
  /** Apunta el clic. Devuelve el testigo que el servidor considera bueno para esta visita. */
  registra(codigo: string, tokenDeVisitante: string): Promise<Result<string, AppError>>;
  /** Ata el testigo de la visita a la cuenta con la que se acaba de entrar. */
  vincula(tokenDeVisitante: string): Promise<Result<void, AppError>>;
}

export const ATRIBUCION_DE_REFERIDO_PORT = new InjectionToken<AtribucionDeReferidoPort>(
  'AtribucionDeReferidoPort',
);
