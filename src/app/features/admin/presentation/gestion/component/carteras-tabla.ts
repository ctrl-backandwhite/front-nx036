import { Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowRightToBracket,
  faClockRotateLeft,
  faPlus,
  faSliders,
  faWallet,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { ResumenDeCartera } from '../../../domain/gestion/model/carteras';
import { ImportesStore } from '../../../application/gestion/state/importes.store';

/** Lo que se puede pedir sobre una cartera desde su fila. */
export type AccionSobreCartera = 'deposito' | 'ajuste' | 'historial';

export interface PeticionSobreCartera {
  readonly cartera: ResumenDeCartera;
  readonly accion: AccionSobreCartera;
}

/**
 * La tabla de carteras de clientes.
 *
 * <p>Los saldos llegan en DÓLARES canónicos —así los guarda el backend— y se escriben en la divisa
 * activa de quien mira. Por eso la columna «Moneda» enseña la divisa en la que se está RENDERIZANDO el
 * saldo y no el código interno del monedero, que es siempre el dólar: enseñar «USD» junto a un importe
 * ya convertido a euros era decir dos cosas incompatibles en la misma fila.
 *
 * <p>El «retenido» solo se escribe cuando lo hay. Un «0,00 €» en esa columna se lee como una retención
 * de cero, que no es lo mismo que no tener ninguna.
 *
 * <p>MOBILE FIRST: la tabla se desplaza dentro de su caja; la página no se descuadra a lo ancho.
 */
@Component({
  selector: 'nx-carteras-tabla',
  imports: [RouterLink, FaIconComponent],
  template: `
    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="table table-zebra table-sm">
          <thead class="bg-ink-50 text-ink-500 text-left text-[12px]">
            <tr>
              <th class="px-4 py-2 font-medium">{{ t('admin.wallets.col.email') }}</th>
              <th class="px-4 py-2 font-medium">{{ t('admin.wallets.col.name') }}</th>
              <th class="px-4 py-2 font-medium text-right">{{ t('admin.wallets.col.balance') }}</th>
              <th class="px-4 py-2 font-medium text-right">{{ t('admin.wallets.col.hold') }}</th>
              <th class="px-4 py-2 font-medium">{{ t('admin.wallets.col.currency') }}</th>
              <th class="px-4 py-2 font-medium">{{ t('admin.wallets.col.status') }}</th>
              <th class="px-4 py-2 font-medium w-44">{{ t('admin.wallets.col.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            @for (cartera of carteras(); track cartera.id) {
              <tr class="border-t border-ink-100 hover:bg-ink-50/50">
                <td class="px-4 py-2 text-[12px] font-mono">{{ cartera.email }}</td>
                <td class="px-4 py-2 text-[12px]">{{ cartera.nombre ?? '—' }}</td>
                <td class="px-4 py-2 text-right font-medium">{{ saldo(cartera.saldoUsd) }}</td>
                <td class="px-4 py-2 text-right text-[12px] text-ink-500">
                  {{ cartera.retenidoUsd > 0 ? saldo(cartera.retenidoUsd) : '—' }}
                </td>
                <td class="px-4 py-2 text-[12px] text-ink-500">{{ importes.activa() }}</td>
                <td class="px-4 py-2">
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                    [class.bg-emerald-100]="cartera.estado === 'ACTIVE'"
                    [class.text-emerald-700]="cartera.estado === 'ACTIVE'"
                    [class.bg-amber-100]="cartera.estado !== 'ACTIVE'"
                    [class.text-amber-700]="cartera.estado !== 'ACTIVE'"
                  >
                    {{ t('admin.wallets.status.' + cartera.estado) }}
                  </span>
                </td>
                <td class="px-4 py-2">
                  <div class="flex gap-1">
                    <!-- La acción principal abre el DETALLE de la cartera —saldos, movimientos y
                         ajuste—, no la ficha del usuario: quien entra aquí viene a mirar dinero. -->
                    <a
                      [routerLink]="['/admin/wallets', cartera.idUsuario]"
                      class="btn btn-outline text-[11px]"
                      [title]="t('admin.wallets.actions.enter')"
                      [attr.aria-label]="t('admin.wallets.actions.enter') + ' · ' + cartera.email"
                    >
                      <fa-icon [icon]="iconos.entra" />
                    </a>
                    <button
                      type="button"
                      (click)="pide.emit({ cartera, accion: 'deposito' })"
                      class="btn btn-outline text-[11px]"
                      [title]="t('admin.wallets.actions.topup')"
                      [attr.aria-label]="t('admin.wallets.actions.topup') + ' · ' + cartera.email"
                    >
                      <fa-icon [icon]="iconos.deposito" />
                    </button>
                    <button
                      type="button"
                      (click)="pide.emit({ cartera, accion: 'ajuste' })"
                      class="btn btn-outline text-[11px]"
                      [title]="t('admin.wallets.actions.adjust')"
                      [attr.aria-label]="t('admin.wallets.actions.adjust') + ' · ' + cartera.email"
                    >
                      <fa-icon [icon]="iconos.ajuste" />
                    </button>
                    <!-- Un solo botón de historial: antes había dos iconos distintos que abrían lo
                         mismo, y quien opera no tenía forma de saber en qué se diferenciaban. -->
                    <button
                      type="button"
                      (click)="pide.emit({ cartera, accion: 'historial' })"
                      class="btn btn-outline text-[11px]"
                      [title]="t('admin.wallets.actions.history')"
                      [attr.aria-label]="t('admin.wallets.actions.history') + ' · ' + cartera.email"
                    >
                      <fa-icon [icon]="iconos.historial" />
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7" class="px-4 py-12 text-center">
                  <fa-icon [icon]="iconos.cartera" class="text-3xl text-ink-300 mb-2" />
                  <div class="text-ink-600 font-medium">{{ t('admin.wallets.empty.title') }}</div>
                  <div class="text-ink-500 text-[12px]">{{ t('admin.wallets.empty.body') }}</div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class CarterasTabla {
  readonly carteras = input<readonly ResumenDeCartera[]>([]);

  readonly pide = output<PeticionSobreCartera>();

  protected readonly iconos = {
    entra: faArrowRightToBracket,
    deposito: faPlus,
    ajuste: faSliders,
    historial: faClockRotateLeft,
    cartera: faWallet,
  };

  protected readonly t = inject(TraduccionService).t;
  protected readonly importes = inject(ImportesStore);

  /** La cartera se lleva en DÓLARES: es la divisa de origen que hay que declarar al escribir. */
  protected saldo(usd: number): string {
    return this.importes.escribe(usd, 'USD');
  }
}
