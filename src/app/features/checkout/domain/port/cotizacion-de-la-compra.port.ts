import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { ItemDelPedido } from '../model/pedido';

/** El precio de una línea, ya escrito por el servidor. Aquí no se multiplica ni se convierte nada. */
export interface LineaValorada {
  readonly productId: string;
  readonly variantId?: string;
  readonly unitarioFormateado?: string;
  readonly totalDeLineaFormateado?: string;
}

export interface ValoracionDeLaCompra {
  readonly lineas: readonly LineaValorada[];
  readonly subtotalFormateado?: string;
}

/**
 * Cuánto valen HOY las líneas que se van a comprar.
 *
 * <p>Puerto propio de «checkout» aunque la cesta tenga uno parecido, y a propósito. Lo que el pago
 * necesita son los importes de las líneas que va a cobrar; lo que la cesta necesita incluye además el
 * peso de cada artículo, que aquí no se enseña. Dos contextos, dos contratos pequeños, y ninguno
 * arrastrando al otro: si mañana la cesta empieza a pedir el volumen del bulto, el pago no se entera.
 */
export interface CotizacionDeLaCompraPort {
  valora(items: readonly ItemDelPedido[]): Promise<Result<ValoracionDeLaCompra, AppError>>;
}

export const COTIZACION_DE_LA_COMPRA_PORT = new InjectionToken<CotizacionDeLaCompraPort>(
  'CotizacionDeLaCompraPort',
);
