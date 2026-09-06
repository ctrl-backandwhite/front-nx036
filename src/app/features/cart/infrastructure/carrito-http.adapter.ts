import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { LineaDeCarrito, ReferenciaDeLinea } from '../domain/model/linea-de-carrito';
import { CarritoRemotoPort } from '../domain/port/carrito.port';
import { LineaDeCarritoDto, aDto, aLinea } from './linea-de-carrito.dto';

/**
 * La cesta de la cuenta, contra nuestro backend.
 *
 * <p>No lleva `providedIn: 'root'`: se registra en `cart.providers.ts`, que es donde se decide qué
 * implementación cumple cada puerto.
 */
@Injectable()
export class CarritoHttpAdapter implements CarritoRemotoPort {
  private readonly api = inject(ApiService);

  async consulta(): Promise<Result<readonly LineaDeCarrito[], AppError>> {
    return this.traduce(await this.api.get<LineaDeCarritoDto[]>('/me/cart'));
  }

  async guarda(linea: LineaDeCarrito): Promise<Result<readonly LineaDeCarrito[], AppError>> {
    return this.traduce(await this.api.put<LineaDeCarritoDto[]>('/me/cart', aDto(linea)));
  }

  async quita(referencia: ReferenciaDeLinea): Promise<Result<readonly LineaDeCarrito[], AppError>> {
    return this.traduce(
      await this.api.delete<LineaDeCarritoDto[]>(`/me/cart/${referencia.productId}`, {
        variantId: referencia.variantId,
      }),
    );
  }

  async fusiona(
    lineas: readonly LineaDeCarrito[],
  ): Promise<Result<readonly LineaDeCarrito[], AppError>> {
    return this.traduce(await this.api.post<LineaDeCarritoDto[]>('/me/cart/merge', lineas.map(aDto)));
  }

  async vacia(): Promise<Result<readonly LineaDeCarrito[], AppError>> {
    return this.traduce(await this.api.delete<LineaDeCarritoDto[]>('/me/cart'));
  }

  /** Toda operación devuelve la cesta COMPLETA: es lo que evita que dos dispositivos diverjan. */
  private traduce(
    respuesta: Result<LineaDeCarritoDto[] | null, AppError>,
  ): Result<readonly LineaDeCarrito[], AppError> {
    return mapea(respuesta, (lista) => (lista ?? []).map(aLinea));
  }
}
