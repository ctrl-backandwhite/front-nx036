import { Component, inject, input } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { Comision, EstadoDeComision } from '../../domain/model/afiliado';

/** El color de cada estado de comisión. Decoración: no cambia lo que dice el importe. */
const INSIGNIA: Readonly<Record<EstadoDeComision, string>> = {
  PENDING: 'badge-warning',
  APPROVED: 'badge-info',
  PAID: 'badge-success',
  REJECTED: 'badge-ghost',
};

/** Las últimas comisiones generadas, con su base, su porcentaje y en qué punto están. */
@Component({
  selector: 'nx-tabla-de-comisiones',
  template: `
    <section class="card overflow-hidden">
      <div class="card-header"><span>{{ t('affiliate.commissions.title') }}</span></div>
      <table class="table table-zebra table-sm">
        <thead class="bg-ink-50 text-ink-500 text-left text-[12px]">
          <tr>
            <th scope="col" class="px-4 py-2 font-medium">{{ t('affiliate.commissions.date') }}</th>
            <th scope="col" class="px-4 py-2 font-medium text-right">
              {{ t('affiliate.commissions.base') }}
            </th>
            <th scope="col" class="px-4 py-2 font-medium text-right">%</th>
            <th scope="col" class="px-4 py-2 font-medium text-right">
              {{ t('affiliate.commissions.amount') }}
            </th>
            <th scope="col" class="px-4 py-2 font-medium">
              {{ t('affiliate.commissions.status') }}
            </th>
          </tr>
        </thead>
        <tbody>
          @for (comision of comisiones(); track comision.id) {
            <tr class="border-t border-ink-100">
              <td class="px-4 py-2 text-[12px] text-ink-500">{{ fecha(comision.creadaEl) }}</td>
              <td class="px-4 py-2 text-right">{{ comision.baseFormateada }}</td>
              <td class="px-4 py-2 text-right">{{ comision.porcentaje }}%</td>
              <td class="px-4 py-2 text-right font-medium">{{ comision.importeFormateado }}</td>
              <td class="px-4 py-2">
                <span [class]="'badge badge-sm ' + insignia(comision.estado)">
                  {{ t('affiliate.commissions.st.' + comision.estado) }}
                </span>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="5" class="px-4 py-8 text-center text-ink-400 text-[13px]">
                {{ t('affiliate.commissions.empty') }}
              </td>
            </tr>
          }
        </tbody>
      </table>
    </section>
  `,
})
export class TablaDeComisiones {
  readonly comisiones = input.required<readonly Comision[]>();

  protected readonly t = inject(TraduccionService).t;

  protected insignia(estado: EstadoDeComision): string {
    return INSIGNIA[estado] ?? 'badge-ghost';
  }

  protected fecha(valor?: string): string {
    return valor ? new Date(valor).toLocaleDateString() : '—';
  }
}
