import { Component, computed, inject, input } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { nombreDePais } from '@ds/component/pais/paises';
import { FichaDePedido } from '../../../domain/logistica/model/pedido';

/**
 * El desglose del cobro, el cliente y la dirección de entrega.
 *
 * <p>Los IMPORTES son los que manda el backend. El navegador no sabe con qué tasa ni con qué redondeo se
 * emitió el cobro —se convierte línea a línea al cobrar—, y volver a convertir el total aquí llegó a
 * enseñar 76,68 € donde se habían cobrado 76,66 €.
 *
 * <p>Envío e impuestos quedan como «por calcular» mientras no existan: un «0,00 €» de envío se lee como
 * envío gratis, que es una promesa distinta.
 */
@Component({
  selector: 'nx-resumen-de-pedido',
  template: `
    <!-- Móvil primero: una columna, y a partir de la anchura media el desglose ocupa dos tercios. -->
    <section class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="card p-4 md:col-span-2">
        <div class="text-[11px] uppercase tracking-wider text-ink-600 mb-2">
          {{ t('admin.orders.detail.breakdown') }}
        </div>
        <dl class="space-y-1.5 text-sm">
          <div class="flex justify-between">
            <dt class="text-ink-700">{{ t('admin.orders.detail.subtotal') }}</dt>
            <dd class="font-medium">{{ pedido().subtotalFormateado || '—' }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-ink-700">{{ t('admin.orders.detail.shipping') }}</dt>
            <dd [class]="pedido().envioFormateado ? 'font-medium' : 'text-ink-400 italic'">
              {{ pedido().envioFormateado ?? t('admin.orders.detail.tbd') }}
            </dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-ink-700">{{ t('admin.orders.detail.taxes') }}</dt>
            <dd [class]="pedido().impuestosFormateado ? 'font-medium' : 'text-ink-400 italic'">
              {{ pedido().impuestosFormateado ?? t('admin.orders.detail.tbd') }}
            </dd>
          </div>
          <div class="flex justify-between border-t border-ink-100 pt-1.5 mt-1.5">
            <dt class="font-medium">{{ t('admin.orders.detail.total') }}</dt>
            <dd class="text-xl font-semibold">{{ pedido().totalFormateado || '—' }}</dd>
          </div>
        </dl>
        <p class="text-[11px] text-ink-400 mt-2">{{ t('admin.orders.detail.tax_note') }}</p>
      </div>
      <div class="card p-4">
        <div class="text-[11px] uppercase tracking-wider text-ink-600">
          {{ t('admin.orders.col.supplier') }}
        </div>
        <div class="font-medium mt-1">{{ pedido().proveedor || '—' }}</div>
      </div>
    </section>

    <section class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      <div class="card p-5">
        <h2 class="font-medium text-sm mb-3">{{ t('admin.orders.detail.customer') }}</h2>
        <dl class="space-y-1 text-[13px]">
          <div class="flex justify-between gap-3">
            <dt class="text-ink-700">{{ t('admin.orders.detail.email') }}</dt>
            <dd class="font-medium text-right font-mono text-[12px]">
              {{ pedido().emailCliente || '—' }}
            </dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-ink-700">{{ t('admin.orders.col.shop') }}</dt>
            <dd class="font-medium text-right">{{ pedido().tienda || '—' }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-ink-700">{{ t('admin.orders.detail.notes') }}</dt>
            <dd class="font-medium text-right">{{ pedido().notas || '—' }}</dd>
          </div>
        </dl>
      </div>
      <div class="card p-5">
        <h2 class="font-medium text-sm mb-3">{{ t('admin.orders.detail.shipping_address') }}</h2>
        @if (pedido().direccionDeEnvio; as direccion) {
          <address class="text-sm leading-relaxed not-italic">
            <span class="font-medium block">{{ direccion.nombreCompleto }}</span>
            <span class="text-ink-700 block">{{ direccion.linea1 }}</span>
            @if (direccion.linea2) {
              <span class="text-ink-700 block">{{ direccion.linea2 }}</span>
            }
            <span class="text-ink-700 block">
              {{ direccion.codigoPostal }} {{ direccion.ciudad }}
              @if (direccion.provincia) {
                , {{ direccion.provincia }}
              }
            </span>
            <span class="text-ink-700 block">{{ paisDelEnvio() }}</span>
            @if (direccion.telefono) {
              <span class="text-ink-500 text-[12px] block mt-1">{{ direccion.telefono }}</span>
            }
          </address>
        } @else {
          <div class="text-ink-500 text-[12px]">{{ t('admin.orders.detail.no_address') }}</div>
        }
      </div>
    </section>
  `,
})
export class ResumenDePedido {
  readonly pedido = input.required<FichaDePedido>();

  protected readonly t = inject(TraduccionService).t;

  /** El nombre del país sale de recorrer la lista entera: se resuelve una vez, no en cada repintado. */
  protected readonly paisDelEnvio = computed(() =>
    nombreDePais(this.pedido().direccionDeEnvio?.pais),
  );
}
