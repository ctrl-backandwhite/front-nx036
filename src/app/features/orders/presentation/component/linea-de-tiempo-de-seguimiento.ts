import { Component, computed, inject, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faTruckFast } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { Seguimiento, tieneAlgoQueContar } from '../../domain/model/seguimiento';
import { BultoDeEnvio } from './bulto-de-envio';
import { PasosDeSeguimiento } from './pasos-de-seguimiento';

/**
 * Seguimiento del envío: guía, entrega estimada y los pasos en orden cronológico inverso.
 *
 * <p>Cuando el pedido viaja en VARIOS paquetes —porque no cabe en uno solo dados los límites del
 * transportista— cada uno se enseña por separado con su propia guía y sus propios pasos.
 *
 * <p>Si no hay nada que contar no se pinta la sección: una tarjeta con el título y el vacío debajo
 * parece un fallo de carga.
 */
@Component({
  selector: 'nx-linea-de-tiempo-de-seguimiento',
  imports: [FaIconComponent, BultoDeEnvio, PasosDeSeguimiento],
  template: `
    @if (seguimiento(); as datos) {
      @if (hayQueContar()) {
        <section class="card p-5">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 class="flex items-center gap-2">
              <fa-icon [icon]="iconoCamion" class="text-primary" /> {{ t('tracking.title') }}
            </h3>
            @if (datos.bultos.length === 0 && datos.numeroDeSeguimiento) {
              <span class="text-[11px] font-mono bg-base-200 rounded px-2 py-1">
                {{ datos.transportista || t('tracking.carrier_default') }} ·
                {{ datos.numeroDeSeguimiento }}
              </span>
            }
          </div>

          @if (datos.bultos.length === 0 && datos.entregaEstimadaEl) {
            <div class="text-xs text-ink-500 mb-3">
              {{ t('tracking.eta') }}: <strong>{{ soloFecha(datos.entregaEstimadaEl) }}</strong>
            </div>
          }

          @if (datos.bultos.length > 0) {
            <div class="space-y-5">
              @for (bulto of datos.bultos; track bulto.secuencia) {
                <nx-bulto-de-envio [bulto]="bulto" [total]="datos.bultos.length" />
              }
            </div>
          } @else if (datos.hitos.length === 0) {
            <p class="text-sm text-ink-500">{{ t('tracking.empty') }}</p>
          } @else {
            <nx-pasos-de-seguimiento [hitos]="datos.hitos" />
          }
        </section>
      }
    }
  `,
})
export class LineaDeTiempoDeSeguimiento {
  readonly seguimiento = input<Seguimiento | null>(null);

  protected readonly iconoCamion = faTruckFast;
  protected readonly t = inject(TraduccionService).t;

  protected readonly hayQueContar = computed(() => {
    const datos = this.seguimiento();
    return !!datos && tieneAlgoQueContar(datos);
  });

  protected soloFecha(valor: string): string {
    return new Date(valor).toLocaleDateString();
  }
}
