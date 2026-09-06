import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { PaginaDeProductos } from '../model/producto';

/**
 * Las fichas por las que ha pasado quien mira.
 *
 * <p>Solo se registra CON SESIÓN: sin usuario no hay a quién asociar la visita, así que a un anónimo
 * ni se le intenta anotar. Anotar es idempotente: volver a la misma ficha mueve la fecha, no duplica.
 */
export interface HistorialPort {
  anota(idDelProducto: string): Promise<Result<void, AppError>>;
  lista(pagina: number, tamano: number): Promise<Result<PaginaDeProductos, AppError>>;
}

export const HISTORIAL_PORT = new InjectionToken<HistorialPort>('HistorialPort');
