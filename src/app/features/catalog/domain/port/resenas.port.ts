import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { ResumenDeResenas } from '../model/catalogo-auxiliar';

export interface ResenaNueva {
  readonly valoracion: number;
  readonly titulo?: string;
  readonly cuerpo?: string;
  readonly idioma: string;
  readonly autor?: string;
}

export interface ResenasPort {
  lista(idDelProducto: string, pagina: number, tamano: number): Promise<Result<ResumenDeResenas, AppError>>;
  publica(idDelProducto: string, resena: ResenaNueva): Promise<Result<void, AppError>>;
}

export const RESENAS_PORT = new InjectionToken<ResenasPort>('ResenasPort');
