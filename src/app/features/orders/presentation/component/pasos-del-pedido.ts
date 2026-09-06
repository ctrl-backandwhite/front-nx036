import { Component, computed, inject, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  IconDefinition,
  faBoxOpen,
  faCheck,
  faCircle,
  faHouseChimneyUser,
  faMoneyBillTransfer,
  faTruck,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PASOS_DEL_PEDIDO, Pedido, estaCancelado, pasoActivo } from '../../domain/model/pedido';

/** El icono y la clave de texto de cada paso. Es decoración: el orden lo fija el dominio. */
const ADORNOS: Readonly<Record<string, IconDefinition>> = {
  placed: faMoneyBillTransfer,
  paid: faCheck,
  forwarded: faBoxOpen,
  shipped: faTruck,
  delivered: faHouseChimneyUser,
};

/**
 * Por dónde va el pedido: cinco hitos, del encargo a la entrega.
 *
 * <p>MOBILE FIRST: en el móvil los pasos se apilan en columna y en escritorio se despliegan en fila con
 * la barra que los une. Por eso `flex-col` va sin prefijo y `md:flex-row` lo amplía.
 *
 * <p>Un pedido cancelado o reembolsado no tiene camino que enseñar: se dice lo que pasó y cuándo.
 */
@Component({
  selector: 'nx-pasos-del-pedido',
  imports: [FaIconComponent],
  template: `
    @if (cancelado()) {
      <div class="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
        {{ t(pedido().estado === 'REFUNDED' ? 'order.detail.refunded' : 'order.detail.cancelled') }}
        @if (pedido().canceladoEl; as fecha) {
          <span class="block text-xs mt-1">{{ t('order.detail.on') }} {{ fechaYHora(fecha) }}</span>
        }
      </div>
    } @else {
      <ol class="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-0 relative">
        @for (paso of pasos; track paso; let i = $index) {
          <li class="flex md:flex-1 items-center gap-2 md:flex-col md:gap-1">
            <div
              class="w-10 h-10 rounded-full inline-flex items-center justify-center text-sm"
              [class.bg-emerald-500]="i <= activo()"
              [class.text-white]="i <= activo()"
              [class.bg-ink-100]="i > activo()"
              [class.text-ink-400]="i > activo()"
              [class.ring-4]="i === activo()"
              [class.ring-emerald-100]="i === activo()"
            >
              <fa-icon [icon]="i <= activo() ? adornos[paso] : iconoPendiente" />
            </div>
            <span
              class="text-xs"
              [class.text-ink-900]="i <= activo()"
              [class.font-medium]="i <= activo()"
              [class.text-ink-400]="i > activo()"
            >
              {{ t('order.detail.timeline.' + paso) }}
            </span>
            @if (i < pasos.length - 1) {
              <div
                class="hidden md:block flex-1 h-0.5 -mx-1"
                [class.bg-emerald-400]="i < activo()"
                [class.bg-ink-100]="i >= activo()"
              ></div>
            }
          </li>
        }
      </ol>
    }
  `,
})
export class PasosDelPedido {
  readonly pedido = input.required<Pedido>();

  protected readonly pasos = PASOS_DEL_PEDIDO;
  protected readonly adornos = ADORNOS;
  protected readonly iconoPendiente = faCircle;
  protected readonly t = inject(TraduccionService).t;

  protected readonly activo = computed(() => pasoActivo(this.pedido()));
  protected readonly cancelado = computed(() => estaCancelado(this.pedido().estado));

  protected fechaYHora(valor: string): string {
    return new Date(valor).toLocaleString();
  }
}
