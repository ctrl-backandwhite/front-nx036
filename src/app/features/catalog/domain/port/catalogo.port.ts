import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { CriterioDeBusqueda } from '../model/criterio-de-busqueda';
import {
  Especificacion,
  FichaDeProducto,
  PaginaDeProductos,
  ResumenDeProducto,
} from '../model/producto';
import { Categoria, Portada, Proveedor } from '../model/catalogo-auxiliar';

/** Lo que hace falta para pedir una página del listado. */
export interface PeticionDeListado {
  readonly criterio: CriterioDeBusqueda;
  readonly pagina: number;
  readonly tamano: number;
  /** Baraja el DESEMPATE. Va aparte de los filtros: no filtra nada. */
  readonly baraja?: number;
  /** Lo que ya hay en la cesta: la referencia contra la que el backend calcula el arancel adicional. */
  readonly productosEnLaCesta?: readonly string[];
}

/**
 * Buscar y leer productos. Es la capacidad principal del contexto.
 *
 * <p>Los puertos se parten por CAPACIDAD y no por sujeto: quien solo quiere pintar las categorías del
 * filtro no tiene por qué implementar la ficha entera para poder poner un doble en una prueba.
 */
export interface CatalogoPort {
  busca(peticion: PeticionDeListado): Promise<Result<PaginaDeProductos, AppError>>;
  ficha(
    slug: string,
    productosEnLaCesta?: readonly string[],
  ): Promise<Result<FichaDeProducto, AppError>>;
  relacionados(idDelProducto: string, limite?: number): Promise<Result<readonly ResumenDeProducto[], AppError>>;
  /**
   * Las especificaciones técnicas del idioma activo. Van aparte de la ficha porque el backend las
   * sirve por su propio endpoint, y porque hay idiomas sin poblar donde se cae al español.
   */
  especificaciones(
    idDelProducto: string,
    idioma?: string,
  ): Promise<Result<readonly Especificacion[], AppError>>;
}

export const CATALOGO_PORT = new InjectionToken<CatalogoPort>('CatalogoPort');

/** Las listas que alimentan los filtros. Otra capacidad, otro puerto. */
export interface TaxonomiaPort {
  categoriasRaiz(): Promise<Result<readonly Categoria[], AppError>>;
  /** El árbol completo con su recuento: es el que sabe qué categorías tienen productos de verdad. */
  arbolDeCategorias(): Promise<Result<readonly Categoria[], AppError>>;
  proveedores(): Promise<Result<readonly Proveedor[], AppError>>;
}

export const TAXONOMIA_PORT = new InjectionToken<TaxonomiaPort>('TaxonomiaPort');

/** Las hileras de la portada. Es el ÚNICO endpoint del catálogo que no exige sesión. */
export interface PortadaPort {
  secciones(porSeccion: number): Promise<Result<Portada, AppError>>;
}

export const PORTADA_PORT = new InjectionToken<PortadaPort>('PortadaPort');
