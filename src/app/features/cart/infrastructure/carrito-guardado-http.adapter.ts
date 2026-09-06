import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { LineaDeCarrito, ReferenciaDeLinea } from '../domain/model/linea-de-carrito';
import { CarritoGuardadoPort } from '../domain/port/carrito.port';
import { LineaDeCarritoDto, aDto, aLinea } from './linea-de-carrito.dto';

/** «Guardar para más tarde» contra nuestro backend. Misma forma de línea, otra lista. */
@Injectable()
export class CarritoGuardadoHttpAdapter implements CarritoGuardadoPort {
  private readonly api = inject(ApiService);

  async consulta(): Promise<Result<readonly LineaDeCarrito[], AppError>> {
    return this.traduce(await this.api.get<LineaDeCarritoDto[]>('/me/saved-cart'));
  }

  async guarda(linea: LineaDeCarrito): Promise<Result<readonly LineaDeCarrito[], AppError>> {
    return this.traduce(await this.api.put<LineaDeCarritoDto[]>('/me/saved-cart', aDto(linea)));
  }

  async quita(referencia: ReferenciaDeLinea): Promise<Result<readonly LineaDeCarrito[], AppError>> {
    return this.traduce(
      await this.api.delete<LineaDeCarritoDto[]>(`/me/saved-cart/${referencia.productId}`, {
        variantId: referencia.variantId,
      }),
    );
  }

  async fusiona(
    lineas: readonly LineaDeCarrito[],
  ): Promise<Result<readonly LineaDeCarrito[], AppError>> {
    return this.traduce(
      await this.api.post<LineaDeCarritoDto[]>('/me/saved-cart/merge', lineas.map(aDto)),
    );
  }

  private traduce(
    respuesta: Result<LineaDeCarritoDto[] | null, AppError>,
  ): Result<readonly LineaDeCarrito[], AppError> {
    return mapea(respuesta, (lista) => (lista ?? []).map(aLinea));
  }
}
