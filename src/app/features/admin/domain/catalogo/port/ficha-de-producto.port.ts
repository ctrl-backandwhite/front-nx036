import { InjectionToken } from '@angular/core';
import { AppError } from '@shared/error/app-error';
import { Result } from '@shared/result/result';
import { CambiosDeFicha, FichaDeProducto } from '../model/ficha-de-producto';
import { CambiosDeVariante, VarianteDeProducto } from '../model/variante-de-producto';

/**
 * La ficha de un producto: leerla y guardar cambios parciales.
 *
 * <p>El IDIOMA viaja en cada operación porque el contenido es por idioma: el título, la descripción y
 * el SEO se revisan uno a uno sin cambiar el idioma de toda la aplicación.
 */
export interface FichaDeProductoPort {
  consulta(id: string, idioma: string): Promise<Result<FichaDeProducto, AppError>>;
  actualiza(
    id: string,
    cambios: CambiosDeFicha,
    idioma: string,
  ): Promise<Result<void, AppError>>;
  /** Elimina un tramo de precio por su cantidad mínima, que es lo que lo identifica. */
  eliminaTramo(id: string, cantidadMinima: number): Promise<Result<void, AppError>>;
}

export const FICHA_DE_PRODUCTO_PORT = new InjectionToken<FichaDeProductoPort>(
  'FichaDeProductoPort',
);

/**
 * La galería del producto. Las imágenes se gestionan POR DIRECCIÓN: no se suben ficheros desde aquí.
 */
export interface ImagenesDeProductoPort {
  anade(productoId: string, url: string): Promise<Result<void, AppError>>;
  elimina(imagenId: string): Promise<Result<void, AppError>>;
  /** Manda los identificadores en el orden deseado; el primero pasa a ser la imagen principal. */
  reordena(productoId: string, imagenIds: readonly string[]): Promise<Result<void, AppError>>;
}

export const IMAGENES_DE_PRODUCTO_PORT = new InjectionToken<ImagenesDeProductoPort>(
  'ImagenesDeProductoPort',
);

/**
 * Las variantes del producto.
 *
 * <p>`lista` devuelve los precios CRUDOS —sin margen y en la divisa canónica—, que son los que se
 * editan. Los de venta llegan por la ficha, ya calculados por el backend.
 */
export interface VariantesPort {
  lista(productoId: string): Promise<Result<readonly VarianteDeProducto[], AppError>>;
  crea(productoId: string, cambios: CambiosDeVariante): Promise<Result<void, AppError>>;
  actualiza(id: string, cambios: CambiosDeVariante): Promise<Result<void, AppError>>;
  /** Solo el precio: no toca el SKU, ni las existencias, ni las opciones. */
  actualizaPrecio(id: string, precio: number): Promise<Result<void, AppError>>;
  elimina(id: string): Promise<Result<void, AppError>>;
}

export const VARIANTES_PORT = new InjectionToken<VariantesPort>('VariantesPort');

/**
 * Los valores de un eje de variación (los colores y los estampados).
 *
 * <p>Renombrar cambia solo la ETIQUETA visible; el valor canónico en chino no se toca nunca, porque es
 * el que casa con el catálogo de origen.
 */
export interface ValoresDeVariacionPort {
  renombra(id: string, valor: string): Promise<Result<void, AppError>>;
  fijaImagen(id: string, url: string): Promise<Result<void, AppError>>;
  /** Elimina el valor y, con él, las combinaciones que lo usan. */
  elimina(id: string): Promise<Result<void, AppError>>;
}

export const VALORES_DE_VARIACION_PORT = new InjectionToken<ValoresDeVariacionPort>(
  'ValoresDeVariacionPort',
);
