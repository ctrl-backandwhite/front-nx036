import { Component, inject, input, output } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { MovimientoDeCartera, traduceNota } from '../../../domain/gestion/model/carteras';
import { ImportesStore } from '../../../application/gestion/state/importes.store';
import { VentanaModal } from './ventana-modal';

/**
 * El vistazo rápido al libro mayor de una cartera desde el listado.
 *
 * <p>Enseña los últimos apuntes sin salir de la lista. El histórico completo, paginado, está en el
 * detalle de la cartera; aquí se trata de responder «¿qué ha pasado?» sin perder el sitio.
 *
 * <p>Las NOTAS llegan del backend en inglés («Order NX-1234», «Wallet recharge via CARD») porque las
 * escribe el servidor sin saber quién las va a leer. Se traducen al pintar —`traduceNota` vive en el
 * dominio— y lo que no se reconoce se enseña tal cual: peor que traducido, mucho mejor que un hueco.
 *
 * <p>El SALDO RESULTANTE es el que persistió el backend con cada apunte, no una suma hecha aquí: si se
 * recalculara, un apunte perdido o desordenado cambiaría todo el histórico hacia atrás.
 *
 * <p>MOBILE FIRST: la lista se desplaza en vertical dentro de la ventana y en horizontal dentro de su
 * caja, para que en una pantalla estrecha se lea sin descuadrar la ventana.
 */
@Component({
  selector: 'nx-carteras-modal-historial',
  imports: [VentanaModal],
  template: `
    <nx-ventana-modal
      [titulo]="t('admin.wallets.history.title') + ' — ' + email()"
      ancho="sm:max-w-xl"
      (cierra)="cierra.emit()"
    >
      <div class="max-h-80 overflow-y-auto overflow-x-auto">
        <table class="table table-sm">
          <thead class="text-[11px] text-ink-500">
            <tr>
              <th class="text-left">{{ t('admin.wallets.history.col.kind') }}</th>
              <th class="text-right">{{ t('admin.wallets.history.col.amount') }}</th>
              <th class="text-right">{{ t('admin.wallets.history.col.balance') }}</th>
              <th class="text-left">{{ t('admin.wallets.history.col.note') }}</th>
              <th class="text-left">{{ t('admin.wallets.history.col.date') }}</th>
            </tr>
          </thead>
          <tbody>
            @if (cargando()) {
              <tr>
                <td colspan="5" class="text-center py-6 text-ink-500 text-[12px]">
                  {{ t('common.loading') }}
                </td>
              </tr>
            } @else {
              @for (movimiento of movimientos(); track movimiento.id) {
                <tr class="text-[11px]">
                  <td>{{ clase(movimiento) }}</td>
                  <td class="text-right font-mono">{{ importe(movimiento.importeCentimos) }}</td>
                  <td class="text-right font-mono text-ink-500">
                    {{ importe(movimiento.saldoResultanteCentimos) }}
                  </td>
                  <td class="truncate max-w-xs">{{ nota(movimiento) }}</td>
                  <td class="text-ink-500">{{ fecha(movimiento) }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="text-center py-6 text-ink-500 text-[12px]">
                    {{ t('admin.wallets.history.empty') }}
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
      <div class="flex justify-end">
        <button type="button" (click)="cierra.emit()" class="btn btn-outline text-[12px]">
          {{ t('actions.cancel') }}
        </button>
      </div>
    </nx-ventana-modal>
  `,
})
export class CarterasModalHistorial {
  readonly email = input('');
  readonly movimientos = input<readonly MovimientoDeCartera[]>([]);
  readonly cargando = input(false);

  readonly cierra = output<void>();

  protected readonly t = inject(TraduccionService).t;
  protected readonly importes = inject(ImportesStore);

  /**
   * La clase del apunte, traducida.
   *
   * <p>El panel anterior enseñaba aquí el código crudo del backend («DEPOSIT») mientras el detalle de la
   * cartera sí lo traducía: la misma columna decía dos cosas distintas según por dónde se entrara. Se
   * traduce en los dos sitios, con respaldo al código si un día apareciera una clase sin clave.
   */
  protected clase(movimiento: MovimientoDeCartera): string {
    const clave = `admin.wallets.kind.${movimiento.clase}`;
    const texto = this.t(clave);
    return texto === clave ? movimiento.clase : texto;
  }

  /** La cartera se lleva en DÓLARES: hay que declararlo para que la conversión salga bien. */
  protected importe(centimos: number): string {
    return this.importes.escribeCentimos(centimos, 'USD');
  }

  protected nota(movimiento: MovimientoDeCartera): string {
    return traduceNota(movimiento.descripcion, this.t);
  }

  protected fecha(movimiento: MovimientoDeCartera): string {
    return new Date(movimiento.creadoEl).toLocaleString();
  }
}
