import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import {
  PrecioPorCantidad,
  PrecioPorCantidadPort,
} from '../domain/port/precio-por-cantidad.port';

interface LineaDto {
  unitFormatted?: string;
  lineTotalFormatted?: string;
}

interface CotizacionDto {
  items?: LineaDto[];
}

/**
 * El precio de una selección, pedido al MISMO presupuesto que usa la cesta.
 *
 * <p>Se manda solo qué y cuánto: ni precios ni divisas. El importe lo compone el servidor de punta a
 * punta y el front no le sugiere ninguna cifra que después pudiera contradecirle.
 */
@Injectable()
export class PrecioPorCantidadHttpAdapter implements PrecioPorCantidadPort {
  private readonly api = inject(ApiService);

  async cotiza(
    idDeProducto: string,
    idDeVariante: string | undefined,
    cantidad: number,
  ): Promise<Result<PrecioPorCantidad, AppError>> {
    const respuesta = await this.api.post<CotizacionDto>('/catalog/cart-quote', [
      { productId: idDeProducto, variantId: idDeVariante || undefined, quantity: cantidad },
    ]);
    return mapea(respuesta, (dto) => {
      const linea = (dto?.items ?? [])[0];
      return {
        unitarioFormateado: linea?.unitFormatted,
        totalFormateado: linea?.lineTotalFormatted,
      };
    });
  }
}
