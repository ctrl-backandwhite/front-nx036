import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PreferenciasService } from '@core/preferences/preferencias';

/**
 * El desglose de la cesta y los dos botones de salida.
 *
 * <p>Envío e impuestos se enseñan como «por calcular» y NO como un importe aproximado. Dependen del
 * destino, los calcula el servidor en el pago, y un aproximado que después sube es la forma más rápida de
 * perder la venta en el último paso. El total estimado es el subtotal mientras eso siga sin calcularse, y
 * la nota de abajo lo dice con todas las letras.
 */
@Component({
  selector: 'nx-resumen-del-carrito',
  imports: [RouterLink],
  template: `
    <div class="card bg-base-100 shadow">
      <div class="card-body gap-4">
        <dl class="space-y-1.5 text-sm">
          <div class="flex items-center justify-between">
            <dt class="opacity-70">{{ t('cart.subtotal') }}</dt>
            <dd class="font-medium">{{ subtotal() }}</dd>
          </div>
          <div class="flex items-center justify-between">
            <dt class="opacity-70">{{ t('cart.shipping_estimated') }}</dt>
            <dd class="opacity-60 italic">{{ t('cart.to_be_calculated') }}</dd>
          </div>
          <div class="flex items-center justify-between">
            <dt class="opacity-70">{{ t('cart.taxes_estimated') }}</dt>
            <dd class="opacity-60 italic">{{ t('cart.to_be_calculated') }}</dd>
          </div>
          <div class="divider my-1"></div>
          <div class="flex items-baseline justify-between">
            <dt class="font-medium">{{ t('cart.estimated_total') }} ({{ moneda() }})</dt>
            <dd class="text-2xl font-medium">{{ subtotal() }}</dd>
          </div>
          <p class="text-[11px] opacity-60 pt-1">{{ t('cart.taxes_note') }}</p>
        </dl>
        <div class="card-actions justify-end">
          <a routerLink="/catalog" class="btn btn-outline">{{ t('cart.keep_shopping') }}</a>
          <a routerLink="/checkout" class="btn btn-primary">{{ t('cart.go_checkout') }}</a>
        </div>
      </div>
    </div>
  `,
})
export class ResumenDelCarrito {
  readonly subtotal = input.required<string>();

  protected readonly t = inject(TraduccionService).t;
  protected readonly moneda = inject(PreferenciasService).moneda;
}
