import { Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBan, faEye, faRoute } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { ResumenDePedido, tieneEnvioEnCurso } from '../../domain/model/pedido';
import { InsigniaDeEstado } from './insignia-de-estado';

/**
 * El listado de pedidos en ESCRITORIO, en forma de tabla.
 *
 * <p>Mobile first: esta vista aparece a partir de `md`; por debajo manda la de tarjetas. La tabla se
 * esconde con `md:block` sobre `hidden`, nunca con un `max-md:`.
 */
@Component({
  selector: 'nx-tabla-de-pedidos',
  imports: [RouterLink, FaIconComponent, InsigniaDeEstado],
  template: `
    <div class="hidden md:block">
      <table class="w-full text-sm">
        <thead class="bg-ink-50 text-ink-500 text-left">
          <tr>
            <th scope="col" class="px-4 py-2">{{ t('orders.col.order') }}</th>
            <th scope="col" class="px-4 py-2">{{ t('orders.col.status') }}</th>
            <th scope="col" class="px-4 py-2">{{ t('orders.col.items') }}</th>
            <th scope="col" class="px-4 py-2 text-right">{{ t('orders.col.total') }}</th>
            <th scope="col" class="px-4 py-2">{{ t('orders.col.date') }}</th>
            <th scope="col" class="px-4 py-2 w-10">
              <span class="sr-only">{{ t('common.actions') }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          @for (pedido of pedidos(); track pedido.id) {
            <tr class="border-t border-ink-100 hover:bg-ink-50/50">
              <!--
                El número es lo primero que se mira de la fila y lo que todo el mundo intenta pulsar:
                lleva al mismo sitio que el ojo del extremo derecho.
              -->
              <td class="px-4 py-3 font-mono text-xs">
                <a [routerLink]="['/orders', pedido.id]" class="text-brand-700 hover:underline">
                  {{ pedido.numero }}
                </a>
              </td>
              <td class="px-4 py-3"><nx-insignia-de-estado [estado]="pedido.estado" /></td>
              <td class="px-4 py-3">{{ pedido.articulos }}</td>
              <td class="px-4 py-3 text-right font-medium">{{ pedido.totalFormateado || '—' }}</td>
              <td class="px-4 py-3 text-ink-500 text-xs">{{ fecha(pedido.realizadoEl) }}</td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-1">
                  @if (conEnvio(pedido)) {
                    <a
                      [routerLink]="['/orders', pedido.id]"
                      [attr.data-tip]="t('orders.track')"
                      [attr.aria-label]="t('orders.track')"
                      class="tooltip tooltip-left inline-flex h-8 w-8 items-center justify-center rounded-lg text-brand-700 hover:bg-brand-50"
                    >
                      <fa-icon [icon]="iconos.ruta" />
                    </a>
                  }
                  <!--
                    Cancelar lo decide el SERVIDOR con «cancelable», no el estado de la fila: un pedido
                    PAGADO deja de poder cancelarse en cuanto se compra el género en 1688, y esa compra
                    avanza en su propio tablero sin mover el estado.
                  -->
                  @if (pedido.cancelable) {
                    <button
                      type="button"
                      (click)="cancela.emit(pedido)"
                      [attr.data-tip]="t('order.detail.cancel')"
                      [attr.aria-label]="t('order.detail.cancel')"
                      class="tooltip tooltip-left inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                    >
                      <fa-icon [icon]="iconos.prohibido" />
                    </button>
                  }
                  <a
                    [routerLink]="['/orders', pedido.id]"
                    [attr.data-tip]="t('common.view')"
                    [attr.aria-label]="t('common.view')"
                    class="tooltip tooltip-left inline-flex h-8 w-8 items-center justify-center rounded-lg text-brand-700 hover:bg-brand-50"
                  >
                    <fa-icon [icon]="iconos.ojo" />
                  </a>
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class TablaDePedidos {
  readonly pedidos = input.required<readonly ResumenDePedido[]>();
  readonly cancela = output<ResumenDePedido>();

  protected readonly iconos = { ruta: faRoute, prohibido: faBan, ojo: faEye };
  protected readonly t = inject(TraduccionService).t;

  protected conEnvio(pedido: ResumenDePedido): boolean {
    return tieneEnvioEnCurso(pedido.estado);
  }

  protected fecha(valor?: string): string {
    return valor ? new Date(valor).toLocaleString() : '—';
  }
}
