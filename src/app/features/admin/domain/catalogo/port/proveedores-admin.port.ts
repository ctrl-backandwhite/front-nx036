import { InjectionToken } from '@angular/core';
import { AppError } from '@shared/error/app-error';
import { Result } from '@shared/result/result';
import {
  CambiosDeProveedor,
  CriterioDeProveedores,
  PaginaDeProveedores,
} from '../model/proveedor-admin';
import { ResultadoMasivo } from '../model/resultado-masivo';

/** Los proveedores del catálogo: alta, edición, verificación y baja. */
export interface ProveedoresAdminPort {
  lista(criterio: CriterioDeProveedores): Promise<Result<PaginaDeProveedores, AppError>>;
  crea(cambios: CambiosDeProveedor): Promise<Result<void, AppError>>;
  actualiza(id: string, cambios: CambiosDeProveedor): Promise<Result<void, AppError>>;
  /** El backend se niega si el proveedor todavía tiene productos: el fallo llega como `AppError`. */
  elimina(id: string): Promise<Result<void, AppError>>;
  alternaVerificado(id: string): Promise<Result<void, AppError>>;
  reindexa(): Promise<Result<number, AppError>>;
}

export const PROVEEDORES_ADMIN_PORT = new InjectionToken<ProveedoresAdminPort>(
  'ProveedoresAdminPort',
);

/** Las acciones que se aplican a varios proveedores marcados. */
export interface ProveedoresMasivosPort {
  /** Fija la verificación a un valor, no la alterna: en lote hay que saber en qué queda cada uno. */
  verifica(ids: readonly string[], verificado: boolean): Promise<Result<ResultadoMasivo, AppError>>;
  /** `eliminaEnLote` y no `elimina`: el mismo adaptador cumple también el puerto de uno solo. */
  eliminaEnLote(ids: readonly string[]): Promise<Result<ResultadoMasivo, AppError>>;
}

export const PROVEEDORES_MASIVOS_PORT = new InjectionToken<ProveedoresMasivosPort>(
  'ProveedoresMasivosPort',
);
