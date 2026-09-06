import { Component, inject, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBan,
  faCircleCheck,
  faPaperPlane,
  faRotateLeft,
  faRotateRight,
  faTruck,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AccionSobrePedido } from '../../../domain/logistica/model/pedido';

/** El orden en que se ofrecen: primero lo que hace avanzar, al final lo que deshace. */
const ACCIONES: readonly AccionSobrePedido[] = ['forward', 'ship', 'deliver', 'refund', 'cancel'];

/**
 * La barra de acciones sobre los pedidos marcados.
 *
 * <p>Solo aparece cuando hay algo marcado: ocupando sitio siempre, con los botones apagados, se leía
 * como una función rota.
 *
 * <p>Las cinco acciones se ofrecen SIEMPRE que haya selección, aunque parte de las filas no las admita:
 * quien marca veinte pedidos no va a mirar el estado de cada uno. El caso de uso separa los elegibles y
 * el parte dice cuántos se saltaron, que es la información que de verdad hace falta.
 */
@Component({
  selector: 'nx-acciones-en-lote',
  imports: [FaIconComponent],
  template: `
    @if (cuantos() > 0) {
      <div class="flex items-center gap-1 flex-wrap mr-1">
        <span class="text-[11px] text-ink-500 mr-1">
          {{ t('admin.orders.bulk.selected').replace('{n}', cuantos().toString()) }}
        </span>
        @for (accion of acciones; track accion) {
          <button
            type="button"
            (click)="pide.emit(accion)"
            [disabled]="ocupado()"
            class="btn btn-outline btn-sm text-[12px]"
            [class.border-red-300]="accion === 'cancel'"
            [class.text-red-700]="accion === 'cancel'"
            [title]="t('admin.orders.bulk.' + accion)"
          >
            <fa-icon
              [icon]="ocupado() && accion === 'cancel' ? iconos.espera : iconos[accion]"
              [class.fa-spin]="ocupado() && accion === 'cancel'"
            />
            {{ t('admin.orders.actions.' + accion) }}
          </button>
        }
      </div>
    }
  `,
})
export class AccionesEnLote {
  readonly cuantos = input(0);
  readonly ocupado = input(false);

  readonly pide = output<AccionSobrePedido>();

  protected readonly acciones = ACCIONES;
  protected readonly t = inject(TraduccionService).t;

  protected readonly iconos = {
    forward: faPaperPlane,
    ship: faTruck,
    deliver: faCircleCheck,
    refund: faRotateLeft,
    cancel: faBan,
    espera: faRotateRight,
  };
}
