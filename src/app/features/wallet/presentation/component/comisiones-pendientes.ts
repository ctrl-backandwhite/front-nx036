import { Component, inject, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faHourglassHalf } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import {
  ComisionPendiente,
  ComisionesPendientes as Comisiones,
  esperaHastaLaAprobacion,
} from '../../domain/model/comisiones-pendientes';

/**
 * Lo que un afiliado tiene prometido pero aún no cobrado.
 *
 * <p>Se pinta en la cartera porque es la pregunta que se hace ahí: «me dijeron que había ganado algo, y
 * el saldo no ha subido». La cuenta atrás explica por qué —hay un periodo de devolución— y cuándo va a
 * dejar de estar pendiente.
 *
 * <p>Se refresca desde fuera con la marca de tiempo `ahora`, para que los días y las horas avancen sin
 * recargar y sin que este componente monte su propio reloj.
 */
@Component({
  selector: 'nx-comisiones-pendientes',
  imports: [FaIconComponent],
  template: `
    @if (comisiones(); as datos) {
      @if (datos.esAfiliado && datos.comisiones.length > 0) {
        <div class="card overflow-hidden">
          <div class="card-header flex items-center justify-between">
            <span>{{ t('wallet.affiliate.title') }}</span>
            <span class="text-sm font-medium text-amber-600">
              {{ t('wallet.affiliate.total_pending') }}: {{ datos.totalFormateado }}
            </span>
          </div>
          <p class="px-4 pt-3 text-[12px] text-ink-500">{{ t('wallet.affiliate.subtitle') }}</p>
          <ul class="p-4 pt-2 space-y-2">
            @for (comision of datos.comisiones; track comision.id) {
              <li
                class="flex items-center justify-between gap-3 border border-ink-100 rounded-lg px-3 py-2"
              >
                <div class="min-w-0">
                  <div class="font-mono text-emerald-700 font-medium">
                    +{{ comision.importeFormateado }}
                  </div>
                  @if (comision.creadaEl; as fecha) {
                    <div class="text-[11px] text-ink-400">{{ soloFecha(fecha) }}</div>
                  }
                </div>
                <div class="flex items-center gap-1.5 text-[12px] text-amber-600 shrink-0">
                  <fa-icon [icon]="iconoReloj" />
                  <span>{{ cuentaAtras(comision) }}</span>
                </div>
              </li>
            }
          </ul>
        </div>
      }
    }
  `,
})
export class ComisionesPendientesPanel {
  readonly comisiones = input<Comisiones | null>(null);
  /**
   * El instante con el que se calcula la cuenta atrás. Quien monta el componente lo mueve cada minuto;
   * pasarlo por entrada mantiene el cálculo determinista y sin relojes escondidos.
   */
  readonly ahora = input(Date.now());

  protected readonly iconoReloj = faHourglassHalf;
  private readonly traduccion = inject(TraduccionService);
  protected readonly t = this.traduccion.t;

  protected cuentaAtras(comision: ComisionPendiente): string {
    const espera = esperaHastaLaAprobacion(comision.apruebaEl, this.ahora());
    switch (espera.clase) {
      case 'sin-fecha':
        return '';
      case 'inminente':
        return this.t('wallet.affiliate.soon');
      case 'dias':
        return this.traduccion.tCon('wallet.affiliate.in_days', { n: espera.cuantos });
      case 'horas':
        return this.traduccion.tCon('wallet.affiliate.in_hours', { n: espera.cuantas });
    }
  }

  protected soloFecha(valor: string): string {
    return new Date(valor).toLocaleDateString();
  }
}
