import { Component, computed, inject, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  IconDefinition,
  faBoxOpen,
  faCircleCheck,
  faCircleXmark,
  faHourglassHalf,
  faMoneyBillTransfer,
  faTruck,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { EstadoDePedido } from '../../domain/model/pedido';

/** Cómo se pinta cada estado. Es decisión de PRESENTACIÓN: el dominio no sabe de colores. */
const ASPECTO: Readonly<Record<EstadoDePedido, { clases: string; icono: IconDefinition }>> = {
  PENDING: { clases: 'bg-ink-100 text-ink-700', icono: faHourglassHalf },
  AWAITING_PAYMENT: { clases: 'bg-amber-100 text-amber-700', icono: faHourglassHalf },
  PAID: { clases: 'bg-emerald-100 text-emerald-700', icono: faMoneyBillTransfer },
  FORWARDED: { clases: 'bg-blue-100 text-blue-700', icono: faBoxOpen },
  SHIPPED: { clases: 'bg-indigo-100 text-indigo-700', icono: faTruck },
  DELIVERED: { clases: 'bg-emerald-100 text-emerald-700', icono: faCircleCheck },
  CANCELLED: { clases: 'bg-red-100 text-red-700', icono: faCircleXmark },
  REFUNDED: { clases: 'bg-ink-200 text-ink-700', icono: faMoneyBillTransfer },
};

/** La pastilla con el estado del pedido, con su color y su icono. */
@Component({
  selector: 'nx-insignia-de-estado',
  imports: [FaIconComponent],
  template: `
    <span [class]="'badge ' + aspecto().clases + ' ' + clase()">
      <fa-icon [icon]="aspecto().icono" class="mr-1" /> {{ t('orders.status.' + estado()) }}
    </span>
  `,
})
export class InsigniaDeEstado {
  readonly estado = input.required<EstadoDePedido>();
  readonly clase = input('');

  protected readonly t = inject(TraduccionService).t;

  /** Un estado desconocido se pinta como pendiente en vez de dejar la fila sin insignia. */
  protected readonly aspecto = computed(() => ASPECTO[this.estado()] ?? ASPECTO.PENDING);
}
