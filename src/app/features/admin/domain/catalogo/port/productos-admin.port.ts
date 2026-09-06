import { InjectionToken } from '@angular/core';
import { AppError } from '@shared/error/app-error';
import { Result } from '@shared/result/result';
import {
  CriterioDeCatalogo,
  EstadoDeProducto,
  PaginaDeProductos,
} from '../model/producto-admin';
import { ResultadoMasivo } from '../model/resultado-masivo';

/**
 * El listado del catálogo y las acciones sobre UN producto.
 *
 * <p>Los puertos se parten por CAPACIDAD y no por sujeto: quien solo lista no tiene por qué arrastrar
 * el borrado en lote ni el recargo, y un doble de prueba no tiene que implementar veinte métodos para
 * comprobar uno.
 */
export interface ProductosAdminPort {
  lista(criterio: CriterioDeCatalogo): Promise<Result<PaginaDeProductos, AppError>>;
  cambiaEstado(id: string, estado: EstadoDeProducto): Promise<Result<void, AppError>>;
  marcaVerificado(id: string, verificado: boolean, idioma: string): Promise<Result<void, AppError>>;
  duplica(id: string, idioma?: string): Promise<Result<void, AppError>>;
  elimina(id: string): Promise<Result<void, AppError>>;
}

export const PRODUCTOS_ADMIN_PORT = new InjectionToken<ProductosAdminPort>('ProductosAdminPort');

/** A qué se aplica un cambio en lote: a lo marcado, a una categoría entera o a todo el catálogo. */
export interface AmbitoMasivo {
  readonly productoIds?: readonly string[];
  readonly categoriaId?: string;
}

/** El recargo fijo por producto, en yuanes. 0 lo quita. */
export interface PeticionDeRecargo extends AmbitoMasivo {
  readonly recargoCny: number;
}

/**
 * Las dos bolsas de subvención, en yuanes.
 *
 * <p>Cada una cubre UNA sola cosa —la primera se descuenta del envío y la segunda del arancel— y lo que
 * sobre de una no cubre la otra. El importe ausente deja esa bolsa como estaba, para poder tocar una
 * sin pisar la otra.
 */
export interface PeticionDeSubvencion extends AmbitoMasivo {
  readonly envioCny?: number;
  readonly arancelCny?: number;
}

/** Las acciones que se aplican a muchos productos de una vez. */
export interface ProductosMasivosPort {
  cambiaEstados(
    ids: readonly string[],
    estado: EstadoDeProducto,
  ): Promise<Result<ResultadoMasivo, AppError>>;
  /**
   * Se llama `eliminaEnLote` y no `elimina` porque un mismo adaptador cumple este puerto y el de un
   * solo producto: dos métodos con el mismo nombre y distinta firma no podrían convivir en él.
   */
  eliminaEnLote(ids: readonly string[]): Promise<Result<ResultadoMasivo, AppError>>;
  fijaRecargo(peticion: PeticionDeRecargo): Promise<Result<number, AppError>>;
  fijaSubvencion(peticion: PeticionDeSubvencion): Promise<Result<number, AppError>>;
}

export const PRODUCTOS_MASIVOS_PORT = new InjectionToken<ProductosMasivosPort>(
  'ProductosMasivosPort',
);

/** Un producto que el barrido no consiguió anunciar al bus del catálogo, con el motivo del intento. */
export interface AnuncioFallido {
  readonly id: string;
  readonly idExterno: string;
  readonly slug: string;
  readonly titulo: string | null;
  readonly intentos: number;
  readonly error: string | null;
  readonly actualizadoEn: string | null;
}

/**
 * Los anuncios al bus del catálogo que se dieron por perdidos.
 *
 * <p>Certificar un producto responde al instante porque el envío al bus va DIFERIDO, así que un fallo
 * ya no cabe en la respuesta de esa petición. Sin esta lista, un producto certificado que no llegó a
 * producción no se echaría en falta hasta semanas después.
 */
export interface AnunciosAlBusPort {
  fallidos(): Promise<Result<readonly AnuncioFallido[], AppError>>;
  reintenta(): Promise<Result<number, AppError>>;
}

export const ANUNCIOS_AL_BUS_PORT = new InjectionToken<AnunciosAlBusPort>('AnunciosAlBusPort');

/** Cuánto queda por comprimir del histórico de imágenes y cuánto está el espejador procesando ahora. */
export interface EstadoDeCompresion {
  readonly pendientes: number;
  readonly enCola: number;
}

/**
 * La compresión del histórico de imágenes, que va por lotes.
 *
 * <p>Coge las MÁS PESADAS primero y devuelve cuántas quedan, que es lo que permite ir encadenando
 * lotes sin adivinar.
 */
export interface CompresionDeImagenesPort {
  estado(): Promise<Result<EstadoDeCompresion, AppError>>;
  encolaLote(limite: number): Promise<Result<EstadoDeCompresion, AppError>>;
}

export const COMPRESION_DE_IMAGENES_PORT = new InjectionToken<CompresionDeImagenesPort>(
  'CompresionDeImagenesPort',
);
