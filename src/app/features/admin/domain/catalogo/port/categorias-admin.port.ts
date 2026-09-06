import { InjectionToken } from '@angular/core';
import { AppError } from '@shared/error/app-error';
import { Result } from '@shared/result/result';
import {
  BorradorDeCategoria,
  CategoriaAdmin,
  CriterioDeCategorias,
  PaginaDeCategorias,
} from '../model/categoria-admin';

/**
 * Las categorías del catálogo.
 *
 * <p>Hay DOS lecturas a propósito y no una: el listado va paginado en servidor —son casi dos mil y
 * traerlas todas para pintar cincuenta filas costaba varios segundos— y el árbol completo solo se pide
 * cuando de verdad hace falta, que es para el selector de padre y para exportar.
 */
export interface CategoriasAdminPort {
  listaPaginada(criterio: CriterioDeCategorias): Promise<Result<PaginaDeCategorias, AppError>>;
  listaTodas(): Promise<Result<readonly CategoriaAdmin[], AppError>>;
  crea(borrador: BorradorDeCategoria): Promise<Result<void, AppError>>;
  actualiza(id: string, borrador: BorradorDeCategoria): Promise<Result<void, AppError>>;
  elimina(id: string): Promise<Result<void, AppError>>;
  alterna(id: string): Promise<Result<void, AppError>>;
  activaEnLote(ids: readonly string[], activa: boolean): Promise<Result<number, AppError>>;
  reindexa(): Promise<Result<number, AppError>>;
}

export const CATEGORIAS_ADMIN_PORT = new InjectionToken<CategoriasAdminPort>('CategoriasAdminPort');

/** Un nodo del árbol de categorías, ya aplanado a «Padre › Hijo» para un desplegable. */
export interface CategoriaParaElegir {
  readonly id: string;
  readonly etiqueta: string;
}

/**
 * El árbol de categorías traducido, para el selector de la ficha.
 *
 * <p>Es otra capacidad que la administración de categorías: aquí solo se leen, y la traducción la
 * resuelve el backend con el idioma que se le pasa.
 */
export interface ArbolDeCategoriasPort {
  consulta(idioma: string): Promise<Result<readonly CategoriaParaElegir[], AppError>>;
}

export const ARBOL_DE_CATEGORIAS_PORT = new InjectionToken<ArbolDeCategoriasPort>(
  'ArbolDeCategoriasPort',
);
