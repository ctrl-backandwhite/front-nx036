import { Component, inject, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  IconDefinition,
  faArrowDown,
  faArrowUp,
  faGears,
  faRotateLeft,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { ClaseDeMovimiento, MovimientoDeCartera } from '../../domain/model/cartera';

/** El icono y el color de cada clase de movimiento. Decoración: no cambia lo que dice el importe. */
const ADORNOS: Readonly<Record<ClaseDeMovimiento, { icono: IconDefinition; color: string }>> = {
  DEPOSIT: { icono: faArrowDown, color: 'text-emerald-600' },
  REFUND: { icono: faArrowDown, color: 'text-emerald-600' },
  RELEASE: { icono: faArrowDown, color: 'text-emerald-600' },
  ADJUSTMENT: { icono: faGears, color: 'text-indigo-600' },
  PAYMENT: { icono: faArrowUp, color: 'text-red-600' },
  WITHDRAW: { icono: faArrowUp, color: 'text-red-600' },
  HOLD: { icono: faRotateLeft, color: 'text-amber-600' },
};

const NEUTRO = { icono: faGears, color: 'text-ink-500' };

/**
 * Los últimos movimientos de la cartera.
 *
 * <p>MOBILE FIRST: en el móvil solo caben tipo, importe y saldo; la descripción entra a partir de `sm` y
 * la fecha a partir de `md`. Las columnas se AÑADEN hacia arriba, nunca se esconden hacia abajo.
 */
@Component({
  selector: 'nx-movimientos-de-cartera',
  imports: [FaIconComponent],
  template: `
    <div class="card overflow-hidden">
      <div class="card-header"><span>{{ t('wallet.transactions') }}</span></div>
      <table class="data-table">
        <thead class="bg-ink-50">
          <tr class="text-left text-ink-500">
            <th scope="col" class="px-4 py-2">{{ t('wallet.col.type') }}</th>
            <th scope="col" class="px-4 py-2">{{ t('wallet.col.amount') }}</th>
            <th scope="col" class="px-4 py-2">{{ t('wallet.col.balance_after') }}</th>
            <th scope="col" class="px-4 py-2 hidden sm:table-cell">
              {{ t('common.description') }}
            </th>
            <th scope="col" class="px-4 py-2 hidden md:table-cell">{{ t('common.date') }}</th>
          </tr>
        </thead>
        <tbody>
          @for (movimiento of movimientos(); track movimiento.id) {
            <tr class="border-t border-ink-100">
              <td class="px-4 py-2">
                <fa-icon
                  [icon]="adorno(movimiento).icono"
                  [class]="'mr-1 ' + adorno(movimiento).color"
                />
                <span class="text-xs uppercase font-medium">{{ movimiento.clase }}</span>
              </td>
              <td
                class="px-4 py-2 font-mono"
                [class.text-emerald-700]="movimiento.esEntrada"
                [class.text-red-700]="!movimiento.esEntrada"
              >
                {{ movimiento.importeFormateado }}
              </td>
              <td class="px-4 py-2 font-mono">{{ movimiento.saldoPosteriorFormateado }}</td>
              <td class="px-4 py-2 hidden sm:table-cell text-ink-500 text-xs">
                {{ movimiento.descripcion }}
              </td>
              <td class="px-4 py-2 hidden md:table-cell text-ink-500 text-xs">
                {{ fechaYHora(movimiento.creadoEl) }}
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="5" class="px-4 py-8 text-center text-ink-500">
                {{ t('wallet.transactions.empty') }}
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class MovimientosDeCartera {
  readonly movimientos = input.required<readonly MovimientoDeCartera[]>();

  protected readonly t = inject(TraduccionService).t;

  protected adorno(movimiento: MovimientoDeCartera): { icono: IconDefinition; color: string } {
    return ADORNOS[movimiento.clase] ?? NEUTRO;
  }

  protected fechaYHora(valor: string): string {
    return new Date(valor).toLocaleString();
  }
}
