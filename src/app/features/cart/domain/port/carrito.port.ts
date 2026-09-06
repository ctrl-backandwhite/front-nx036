import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { LineaDeCarrito, ReferenciaDeLinea } from '../model/linea-de-carrito';

/**
 * La cesta ACTIVA guardada en la cuenta: lo que se añade en la web aparece en la aplicación móvil y al
 * revés.
 *
 * <p>Todas las operaciones devuelven la CESTA COMPLETA ya actualizada. El cliente sustituye su estado con
 * la respuesta en vez de reconstruirlo, así que dos dispositivos no acaban con vistas distintas y las
 * correcciones del servidor —subir la cantidad al pedido mínimo del catálogo, por ejemplo— llegan solas.
 */
export interface CarritoRemotoPort {
  consulta(): Promise<Result<readonly LineaDeCarrito[], AppError>>;
  /** FIJA la cantidad de la línea, no la suma: quien llama manda el total resultante. */
  guarda(linea: LineaDeCarrito): Promise<Result<readonly LineaDeCarrito[], AppError>>;
  quita(referencia: ReferenciaDeLinea): Promise<Result<readonly LineaDeCarrito[], AppError>>;
  /** SUMA las cantidades repetidas: es lo que se espera al subir la cesta del invitado al entrar. */
  fusiona(lineas: readonly LineaDeCarrito[]): Promise<Result<readonly LineaDeCarrito[], AppError>>;
  vacia(): Promise<Result<readonly LineaDeCarrito[], AppError>>;
}

export const CARRITO_REMOTO_PORT = new InjectionToken<CarritoRemotoPort>('CarritoRemotoPort');

/**
 * «Guardar para más tarde»: la segunda lista, apartada de la cesta y que no se cobra.
 *
 * <p>Es otra CAPACIDAD y por eso es otro puerto, aunque hable de las mismas líneas y viva en el mismo
 * backend: quien solo mueve cosas a guardados no tiene por qué poder vaciar la cesta.
 */
export interface CarritoGuardadoPort {
  consulta(): Promise<Result<readonly LineaDeCarrito[], AppError>>;
  guarda(linea: LineaDeCarrito): Promise<Result<readonly LineaDeCarrito[], AppError>>;
  quita(referencia: ReferenciaDeLinea): Promise<Result<readonly LineaDeCarrito[], AppError>>;
  fusiona(lineas: readonly LineaDeCarrito[]): Promise<Result<readonly LineaDeCarrito[], AppError>>;
}

export const CARRITO_GUARDADO_PORT = new InjectionToken<CarritoGuardadoPort>('CarritoGuardadoPort');
