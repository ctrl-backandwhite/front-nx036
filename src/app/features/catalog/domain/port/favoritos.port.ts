import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { PaginaDeProductos } from '../model/producto';

/**
 * La lista de deseos.
 *
 * <p>`identificadores()` está separado de `lista()` a propósito: el corazón de cada tarjeta solo
 * necesita saber si un identificador está dentro, y pedir la página entera con sus precios para pintar
 * un icono sería traer cien veces más datos de los que hacen falta.
 */
export interface FavoritosPort {
  identificadores(): Promise<Result<readonly string[], AppError>>;
  anade(idDelProducto: string): Promise<Result<void, AppError>>;
  quita(idDelProducto: string): Promise<Result<void, AppError>>;
  lista(pagina: number, tamano: number): Promise<Result<PaginaDeProductos, AppError>>;
}

export const FAVORITOS_PORT = new InjectionToken<FavoritosPort>('FavoritosPort');
