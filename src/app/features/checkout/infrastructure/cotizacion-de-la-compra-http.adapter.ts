import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { ItemDelPedido } from '../domain/model/pedido';
import {
  CotizacionDeLaCompraPort,
  ValoracionDeLaCompra,
} from '../domain/port/cotizacion-de-la-compra.port';

interface LineaDto {
  productId: string;
  variantId?: string;
  unitFormatted?: string;
  lineTotalFormatted?: string;
}

/**
 * Lo que valen HOY las líneas que se van a cobrar.
 *
 * <p>El cuerpo lleva solo qué y cuánto: el precio lo calcula el servidor de punta a punta y el navegador
 * no le sugiere ninguna cifra que después pudiera contradecirle.
 */
@Injectable()
export class CotizacionDeLaCompraHttpAdapter implements CotizacionDeLaCompraPort {
  private readonly api = inject(ApiService);

  async valora(items: readonly ItemDelPedido[]): Promise<Result<ValoracionDeLaCompra, AppError>> {
    const respuesta = await this.api.post<{ items?: LineaDto[]; subtotalFormatted?: string }>(
      '/catalog/cart-quote',
      items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId || undefined,
        quantity: item.cantidad,
      })),
    );
    return mapea(respuesta, (dto) => ({
      lineas: (dto?.items ?? []).map((linea) => ({
        productId: linea.productId,
        variantId: linea.variantId,
        unitarioFormateado: linea.unitFormatted,
        totalDeLineaFormateado: linea.lineTotalFormatted,
      })),
      subtotalFormateado: dto?.subtotalFormatted,
    }));
  }
}
