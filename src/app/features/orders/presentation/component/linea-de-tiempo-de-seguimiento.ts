import { Component, computed, inject, input } from '@angular/core';
import { FormatoDeFecha } from '@core/i18n/formato-de-fecha';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faTruckFast } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { Seguimiento, enlaceSeguro, tieneAlgoQueContar } from '../../domain/model/seguimiento';
import { BultoDeEnvio } from './bulto-de-envio';
import { FaseDelEnvio } from './fase-del-envio';
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
  // Nace en BLOQUE: un elemento personalizado es `inline` por defecto y un inline ignora
  // los márgenes verticales, así que bajo un contenedor con `space-y` se pega al de al lado.
  host: { class: 'block' },
  selector: 'nx-linea-de-tiempo-de-seguimiento',
  imports: [FaIconComponent, BultoDeEnvio, FaseDelEnvio, PasosDeSeguimiento],
  template: `
    @if (seguimiento(); as datos) {
      @if (hayQueContar()) {
        <section class="card p-5">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 class="flex items-center gap-2">
              <fa-icon [icon]="iconoCamion" class="text-primary" /> {{ t('tracking.title') }}
            </h3>
            <nx-fase-del-envio [fase]="datos.fase" />
          </div>

          @if (datos.bultos.length === 0 && datos.numeroDeSeguimiento) {
            <div class="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span class="text-xs font-mono bg-base-200 rounded px-2 py-1">
                {{ datos.transportista || t('tracking.carrier_default') }} ·
                {{ datos.numeroDeSeguimiento }}
              </span>
              @if (enlace(); as url) {
                <a
                  [href]="url"
                  target="_blank"
                  rel="noopener"
                  class="link link-primary inline-flex min-h-11 items-center text-xs"
                  data-enlace-de-seguimiento
                >
                  {{ t('tracking.follow') }}
                </a>
              }
            </div>
          }

          @if (datos.bultos.length > 0 && (datos.transportista || enlace())) {
            <div class="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              @if (datos.transportista) {
                <span class="text-ink-500">
                  {{ t('tracking.carrier') }}: <strong>{{ datos.transportista }}</strong>
                </span>
              }
              @if (enlace(); as url) {
                <a
                  [href]="url"
                  target="_blank"
                  rel="noopener"
                  class="link link-primary inline-flex min-h-11 items-center"
                  data-enlace-de-seguimiento
                >
                  {{ t('tracking.follow') }}
                </a>
              }
            </div>
          }

          @if (datos.impuestosAlRecibir) {
            <div class="alert alert-warning mb-3 text-sm" role="note" data-impuestos-al-recibir>
              {{ t('tracking.taxes_on_delivery') }}
            </div>
          }

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
  private readonly fechas = inject(FormatoDeFecha);
  protected readonly t = inject(TraduccionService).t;

  protected readonly hayQueContar = computed(() => {
    const datos = this.seguimiento();
    return !!datos && tieneAlgoQueContar(datos);
  });

  protected readonly enlace = computed(() => enlaceSeguro(this.seguimiento()?.urlDeSeguimiento));

  protected soloFecha(valor: string): string {
    return this.fechas.soloFecha(valor);
  }
}
