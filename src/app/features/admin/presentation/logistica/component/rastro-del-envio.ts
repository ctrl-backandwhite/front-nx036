import { Component, computed, inject, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBoxOpen, faLocationDot, faTruckFast } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { Seguimiento, pasosDelEnvio } from '../../../domain/logistica/model/seguimiento';
import { InsigniaEstado } from './insignia-estado';

/**
 * El rastro del envío: guía, entrega estimada y los pasos, lo más reciente arriba.
 *
 * <p>PIEZA IMPROVISADA: en el front de React es un componente compartido con la ficha de pedido del
 * comprador, que porta el equipo de «orders». Se hace aquí una versión mínima para no bloquear; cuando
 * exista la compartida, esta se retira.
 *
 * <p>Cuando el pedido viaja en VARIOS bultos —porque no cabe en uno dados los límites del
 * transportista— cada uno se enseña por separado con su propia guía y sus propios pasos: mezclarlos en
 * una lista hace imposible saber qué le pasa a cada bulto.
 */
@Component({
  selector: 'nx-rastro-del-envio',
  imports: [FaIconComponent, InsigniaEstado],
  template: `
    @if (hayRastro()) {
      <section class="card p-4 space-y-4">
        <header class="flex flex-wrap items-center gap-2">
          <fa-icon [icon]="iconoCamion" class="text-primary" />
          <span class="text-sm font-medium">{{ t('tracking.title') }}</span>
          @if (envio().estado; as estado) {
            <nx-insignia-estado [estado]="estado" />
          }
          @if (envio().numeroDeSeguimiento; as guia) {
            <span class="font-mono text-[12px] text-ink-500">{{ guia }}</span>
          }
        </header>

        @if (envio().entregaPrevistaEl; as prevista) {
          <p class="text-[12px] text-ink-500">{{ t('tracking.eta') }}: {{ prevista }}</p>
        }

        @if (bultos().length > 0) {
          <div class="space-y-4">
            @for (bulto of bultos(); track bulto.secuencia) {
              <div class="border-t border-ink-100 pt-3">
                <div class="flex flex-wrap items-center gap-2 text-[12px]">
                  <fa-icon [icon]="iconoCaja" class="text-ink-400" />
                  <span class="font-medium">{{ t('tracking.parcel') }} {{ bulto.secuencia }}</span>
                  @if (bulto.numeroDeSeguimiento; as guia) {
                    <span class="font-mono text-ink-500">{{ guia }}</span>
                  }
                </div>
                <ol class="mt-2 space-y-2">
                  @for (paso of pasosDe(bulto.eventos); track $index) {
                    <li class="flex gap-2 text-[12px]">
                      <fa-icon [icon]="iconoLugar" class="mt-0.5 text-ink-300" />
                      <span>
                        <span class="font-medium">{{ paso.descripcion || paso.estado }}</span>
                        @if (paso.lugar) {
                          <span class="text-ink-500"> · {{ paso.lugar }}</span>
                        }
                        @if (paso.ocurridoEl) {
                          <span class="block text-ink-400">{{ paso.ocurridoEl }}</span>
                        }
                      </span>
                    </li>
                  }
                </ol>
              </div>
            }
          </div>
        } @else {
          <ol class="space-y-2">
            @for (paso of pasos(); track $index) {
              <li class="flex gap-2 text-[12px]">
                <fa-icon [icon]="iconoLugar" class="mt-0.5 text-ink-300" />
                <span>
                  <span class="font-medium">{{ paso.descripcion || paso.estado }}</span>
                  @if (paso.lugar) {
                    <span class="text-ink-500"> · {{ paso.lugar }}</span>
                  }
                  @if (paso.ocurridoEl) {
                    <span class="block text-ink-400">{{ paso.ocurridoEl }}</span>
                  }
                </span>
              </li>
            }
          </ol>
        }
      </section>
    }
  `,
})
export class RastroDelEnvio {
  readonly envio = input.required<Seguimiento>();

  protected readonly iconoCamion = faTruckFast;
  protected readonly iconoLugar = faLocationDot;
  protected readonly iconoCaja = faBoxOpen;
  protected readonly t = inject(TraduccionService).t;

  protected readonly bultos = computed(() => this.envio().bultos);
  protected readonly pasos = computed(() => pasosDelEnvio(this.envio().eventos));

  /** Sin guía y sin un solo paso no se pinta un recuadro vacío: se calla. */
  protected readonly hayRastro = computed(() => {
    const envio = this.envio();
    return (
      !!envio.numeroDeSeguimiento || envio.eventos.length > 0 || envio.bultos.length > 0
    );
  });

  protected pasosDe(eventos: Seguimiento['eventos']) {
    return pasosDelEnvio(eventos);
  }
}
