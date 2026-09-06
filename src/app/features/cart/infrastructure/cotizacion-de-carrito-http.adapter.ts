import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { CotizacionDeCarrito, ItemACotizar } from '../domain/model/cotizacion-de-carrito';
import { CotizacionDeCarritoPort } from '../domain/port/cotizacion-de-carrito.port';

interface LineaCotizadaDto {
  productId: string;
  variantId?: string;
  unitFormatted?: string;
  lineTotalFormatted?: string;
  weightGrams?: number | null;
}

interface CotizacionDto {
  items?: LineaCotizadaDto[];
  subtotalFormatted?: string;
  totalWeightGrams?: number;
  weightIncomplete?: boolean;
}

/**
 * La cotización de la cesta contra el backend.
 *
 * <p>El cuerpo lleva SOLO qué y cuánto. Ni títulos, ni precios, ni divisas: el importe lo calcula el
 * servidor de punta a punta y el front no le sugiere ninguna cifra que después pudiera contradecirle.
 */
@Injectable()
export class CotizacionDeCarritoHttpAdapter implements CotizacionDeCarritoPort {
  private readonly api = inject(ApiService);

  async cotiza(items: readonly ItemACotizar[]): Promise<Result<CotizacionDeCarrito, AppError>> {
    const respuesta = await this.api.post<CotizacionDto>(
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
        pesoGramos: linea.weightGrams,
      })),
      subtotalFormateado: dto?.subtotalFormatted,
      pesoTotalGramos: dto?.totalWeightGrams,
      pesoIncompleto: dto?.weightIncomplete,
    }));
  }
}
