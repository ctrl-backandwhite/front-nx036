import { InjectionToken } from '@angular/core';
import { AppError } from '@shared/error/app-error';
import { Result } from '@shared/result/result';
import { BorradorDeGrupo, GrupoDeProductos, MiembroDeGrupo } from '../model/grupo-de-productos';

/** Los grupos de productos, que son el ámbito `PRODUCT_GROUP` de las reglas de margen. */
export interface GruposDeProductosPort {
  lista(): Promise<Result<readonly GrupoDeProductos[], AppError>>;
  crea(borrador: BorradorDeGrupo): Promise<Result<void, AppError>>;
  actualiza(id: string, borrador: BorradorDeGrupo): Promise<Result<void, AppError>>;
  /** El backend se niega si una regla de margen sigue usando el grupo. */
  elimina(id: string): Promise<Result<void, AppError>>;
}

export const GRUPOS_DE_PRODUCTOS_PORT = new InjectionToken<GruposDeProductosPort>(
  'GruposDeProductosPort',
);

/**
 * Quién está dentro de un grupo.
 *
 * <p>Va aparte de administrar el grupo: son dos pantallas distintas y quien solo pinta la tabla no
 * necesita poder mover miembros.
 */
export interface MiembrosDeGrupoPort {
  lista(grupoId: string): Promise<Result<readonly MiembroDeGrupo[], AppError>>;
  anade(grupoId: string, productoIds: readonly string[]): Promise<Result<number, AppError>>;
  quita(grupoId: string, productoId: string): Promise<Result<void, AppError>>;
  /** Busca productos por texto para poder elegir a quién meter. */
  busca(texto: string): Promise<Result<readonly MiembroDeGrupo[], AppError>>;
}

export const MIEMBROS_DE_GRUPO_PORT = new InjectionToken<MiembrosDeGrupoPort>('MiembrosDeGrupoPort');
