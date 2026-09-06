import { Component, inject, input } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { Pedido } from '../../domain/model/pedido';

/**
 * El desglose de lo que se pagó.
 *
 * <p>TODOS los importes llegan ya formateados por el backend y aquí no se suma, ni se resta, ni se
 * convierte nada: es norma dura del proyecto. Cada línea se convirtió a la moneda mostrada por separado
 * y en el servidor, así que rehacer la cuenta en el navegador da otro número que el cobrado.
 */
@Component({
  selector: 'nx-resumen-de-pago',
  template: `
    <div class="card p-5">
      <h3>{{ t('order.detail.payment_summary') }}</h3>
      <dl class="text-sm mt-2 space-y-1">
        <div class="flex justify-between">
          <dt class="text-ink-500">{{ t('order.detail.subtotal') }}</dt>
          <dd>{{ pedido().subtotalFormateado || '—' }}</dd>
        </div>
        @if (pedido().descuentoFormateado) {
          <div class="flex justify-between text-emerald-600">
            <dt>{{ t('checkout.discount') }}</dt>
            <dd>−{{ pedido().descuentoFormateado }}</dd>
          </div>
        }
        <div class="flex justify-between">
          <dt class="text-ink-500">{{ t('order.detail.shipping') }}</dt>
          <dd>{{ pedido().envioFormateado || '—' }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-ink-500">{{ t('order.detail.tax') }}</dt>
          <dd>{{ pedido().impuestosFormateado || '—' }}</dd>
        </div>
        <div class="flex justify-between border-t border-ink-100 pt-1.5 mt-1.5 font-medium">
          <dt>{{ t('checkout.total') }}</dt>
          <dd>{{ pedido().totalFormateado || '—' }}</dd>
        </div>
      </dl>
      @if (pedido().notas; as notas) {
        <div class="mt-3 text-xs text-ink-500">
          <strong>{{ t('checkout.notes') }}:</strong> {{ notas }}
        </div>
      }
    </div>
  `,
})
export class ResumenDePago {
  readonly pedido = input.required<Pedido>();

  protected readonly t = inject(TraduccionService).t;
}
