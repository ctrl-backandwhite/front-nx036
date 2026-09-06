import { Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faRoute } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { ResumenDePedido, tieneEnvioEnCurso } from '../../domain/model/pedido';
import { InsigniaDeEstado } from './insignia-de-estado';

/**
 * El listado de pedidos en MÓVIL: una tarjeta por pedido, y la tarjeta entera es el enlace.
 *
 * <p>Es la vista por defecto —sin prefijo— y se retira a partir de `md`, donde entra la tabla. Cancelar
 * va dentro del enlace, así que hay que frenar el evento: sin eso, pulsar «cancelar» abría la ficha y la
 * cancelación se perdía por el camino.
 */
@Component({
  selector: 'nx-tarjetas-de-pedidos',
  imports: [RouterLink, FaIconComponent, InsigniaDeEstado],
  template: `
    <div class="md:hidden divide-y divide-ink-100">
      @for (pedido of pedidos(); track pedido.id) {
        <a [routerLink]="['/orders', pedido.id]" class="block p-4 hover:bg-ink-50/50">
          <div class="flex items-center justify-between gap-2">
            <span class="font-mono text-xs">{{ pedido.numero }}</span>
            <nx-insignia-de-estado [estado]="pedido.estado" clase="text-[10px]" />
          </div>
          <div class="mt-1 flex items-center justify-between text-xs text-ink-500">
            <span>{{ pedido.articulos }} {{ t('orders.items_short') }}</span>
            <span class="text-ink-900 font-medium">{{ pedido.totalFormateado || '—' }}</span>
          </div>
          <div class="mt-1 flex items-center justify-between text-[11px] text-ink-500">
            <span>{{ fecha(pedido.realizadoEl) }}</span>
            <span class="inline-flex items-center gap-3">
              @if (pedido.cancelable) {
                <button type="button" class="text-red-600 min-h-11 px-1" (click)="pideCancelar($event, pedido)">
                  {{ t('order.detail.cancel') }}
                </button>
              }
              @if (conEnvio(pedido)) {
                <span class="text-brand-700 inline-flex items-center gap-1">
                  <fa-icon [icon]="iconoRuta" /> {{ t('orders.track') }}
                </span>
              }
            </span>
          </div>
        </a>
      }
    </div>
  `,
})
export class TarjetasDePedidos {
  readonly pedidos = input.required<readonly ResumenDePedido[]>();
  readonly cancela = output<ResumenDePedido>();

  protected readonly iconoRuta = faRoute;
  protected readonly t = inject(TraduccionService).t;

  protected conEnvio(pedido: ResumenDePedido): boolean {
    return tieneEnvioEnCurso(pedido.estado);
  }

  protected fecha(valor?: string): string {
    return valor ? new Date(valor).toLocaleString() : '—';
  }

  protected pideCancelar(evento: Event, pedido: ResumenDePedido): void {
    evento.preventDefault();
    evento.stopPropagation();
    this.cancela.emit(pedido);
  }
}
