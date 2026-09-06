import { Injectable, Injector, Signal, computed, inject, resource, untracked } from '@angular/core';
import { ItemDelPedido } from '../../domain/model/pedido';
import {
  COTIZACION_DE_LA_COMPRA_PORT,
  ValoracionDeLaCompra,
} from '../../domain/port/cotizacion-de-la-compra.port';

/** Lo que se pinta mientras el importe viaja. Nunca un precio calculado en el navegador. */
const MIENTRAS_LLEGA = '…';

export interface VistaDeValoracion {
  readonly subtotal: Signal<string>;
  unitario(item: ItemDelPedido): string;
  totalDeLinea(item: ItemDelPedido): string;
}

/**
 * Cuánto valen HOY las líneas que se van a cobrar.
 *
 * <p>Los importes que se enseñan en el pago son EXACTAMENTE los que se facturan: se piden al servidor con
 * el margen y el cambio del día. Sin esto, la cesta enseñaba un precio congelado al añadir y el cobro era
 * otro.
 */
@Injectable()
export class ValoraLaCompra {
  private readonly puerto = inject(COTIZACION_DE_LA_COMPRA_PORT);
  private readonly inyector = inject(Injector);

  para(items: Signal<readonly ItemDelPedido[]>): VistaDeValoracion {
    const fuente = resource<ValoracionDeLaCompra | undefined, string | undefined>({
      injector: this.inyector,
      params: () => {
        const lineas = items();
        return lineas.length === 0
          ? undefined
          : lineas.map((l) => `${l.productId}:${l.variantId ?? ''}:${l.cantidad}`).join(',');
      },
      loader: async () => {
        const resultado = await this.puerto.valora(untracked(items));
        return resultado.ok ? resultado.valor : undefined;
      },
    });

    const valoracion = computed(() => fuente.value());
    const linea = (item: ItemDelPedido) =>
      valoracion()?.lineas.find(
        (l) => l.productId === item.productId && (l.variantId ?? '') === (item.variantId ?? ''),
      );

    return {
      subtotal: computed(() => valoracion()?.subtotalFormateado ?? MIENTRAS_LLEGA),
      unitario: (item) => linea(item)?.unitarioFormateado ?? MIENTRAS_LLEGA,
      totalDeLinea: (item) => linea(item)?.totalDeLineaFormateado ?? MIENTRAS_LLEGA,
    };
  }
}
