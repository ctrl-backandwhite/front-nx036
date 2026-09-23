import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';

/** Lo que cuesta de verdad una selección concreta, ya escrito por el servidor. */
export interface PrecioPorCantidad {
  readonly unitarioFormateado?: string;
  readonly totalFormateado?: string;
}

/**
 * El precio de una selección —producto, variante y cantidad— tal como lo va a cobrar el servidor.
 *
 * <p>Existe porque el precio por rango de cantidad NO se puede componer en el navegador. Los tramos
 * son del producto y cada variante tiene su coste, así que el escalón se aplica como una proporción
 * sobre el precio de la variante; multiplicar aquí sería calcular precios en el cliente, que es
 * justo lo que la norma del proyecto prohíbe, y era la causa de que la ficha dijera un importe y el
 * cobro fuera otro.
 *
 * <p>Va contra el MISMO presupuesto que usa la cesta (`/api/catalog/cart-quote`), no contra un
 * cálculo paralelo: la ficha, la cesta, el resumen del pago y la pasarela salen todos de ahí, así
 * que no pueden separarse ni un céntimo.
 */
export interface PrecioPorCantidadPort {
  cotiza(
    idDeProducto: string,
    idDeVariante: string | undefined,
    cantidad: number,
  ): Promise<Result<PrecioPorCantidad, AppError>>;
}

export const PRECIO_POR_CANTIDAD_PORT = new InjectionToken<PrecioPorCantidadPort>(
  'PrecioPorCantidadPort',
);
