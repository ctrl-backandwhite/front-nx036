import { Component, computed, inject, input, output } from '@angular/core';
import { FormatoDeFecha } from '@core/i18n/formato-de-fecha';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBoxOpen, faLocationDot, faTruckFast } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import {
  Bulto,
  FaseDeEnvio,
  Seguimiento,
  enlaceSeguro,
  formateaCosteReal,
  guiaAnulable,
  pasosDelEnvio,
} from '../../../domain/logistica/model/seguimiento';
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
  // Nace en BLOQUE: un elemento personalizado es `inline` por defecto y un inline ignora
  // los márgenes verticales, así que bajo un contenedor con `space-y` se pega al de al lado.
  host: { class: 'block' },
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
          @if (envio().fase; as fase) {
            <span class="badge badge-sm badge-primary" data-fase-del-envio>
              {{ rotuloDeFase(fase) }}
            </span>
          }
          @if (envio().transportista; as transportista) {
            <span class="text-[12px] text-ink-500">{{ transportista }}</span>
          }
          @if (enlace(envio().urlDeSeguimiento); as url) {
            <a [href]="url" target="_blank" rel="noopener" class="link link-primary text-[12px]">
              {{ t('tracking.follow') }}
            </a>
          }
        </header>

        @if (envio().entregaPrevistaEl; as prevista) {
          <p class="text-[12px] text-ink-500">{{ t('tracking.eta') }}: {{ prevista }}</p>
        }

        @if (bultos().length > 0) {
          <div class="space-y-4">
            @for (bulto of bultos(); track bulto.bulto.secuencia) {
              @let bultoDelEnvio = bulto.bulto;
              <div class="border-t border-ink-100 pt-3">
                <div class="flex flex-wrap items-center gap-2 text-[12px]">
                  <fa-icon [icon]="iconoCaja" class="text-ink-400" />
                  <span class="font-medium">
                    {{ t('tracking.parcel') }} {{ bultoDelEnvio.secuencia }}
                  </span>
                  @if (bultoDelEnvio.numeroDeSeguimiento; as guia) {
                    <span class="font-mono text-ink-500">{{ guia }}</span>
                  }
                  @if (bultoDelEnvio.fase; as fase) {
                    <span class="badge badge-sm badge-primary" data-fase-del-envio>
                      {{ rotuloDeFase(fase) }}
                    </span>
                  }
                </div>
                <dl class="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-ink-500">
                  @if (bultoDelEnvio.transportista; as transportista) {
                    <div>
                      <dt class="inline">{{ t('tracking.carrier') }}:</dt>
                      <dd class="inline font-medium text-ink-700">{{ transportista }}</dd>
                    </div>
                  }
                  @if (bultoDelEnvio.ultimaConsultaEl; as consulta) {
                    <div>
                      <dt class="inline">{{ t('admin.shipment.last_tracked') }}:</dt>
                      <dd class="inline">{{ fechaYHora(consulta) }}</dd>
                    </div>
                  }
                  @if (bultoDelEnvio.incidenciasAbiertas; as abiertas) {
                    <div data-incidencias-abiertas>
                      <dt class="inline">{{ t('admin.shipment.open_incidents') }}:</dt>
                      <dd class="inline badge badge-warning badge-sm">{{ abiertas }}</dd>
                    </div>
                  }
                  @if (bultoDelEnvio.costeReal; as costeReal) {
                    <div data-coste-real>
                      <dt class="inline">{{ t('admin.shipment.actual_freight') }}:</dt>
                      <dd class="inline font-medium text-ink-700">{{ coste(costeReal) }}</dd>
                    </div>
                  }
                </dl>
                <div class="mt-2 flex flex-wrap items-center gap-2">
                  @if (enlace(bultoDelEnvio.urlDeSeguimiento); as url) {
                    <a [href]="url" target="_blank" rel="noopener" class="link link-primary text-[12px]">
                      {{ t('tracking.follow') }}
                    </a>
                  }
                  @if (enlace(bultoDelEnvio.pruebaDeEntregaUrl); as url) {
                    <a [href]="url" target="_blank" rel="noopener" class="link link-primary text-[12px]">
                      {{ t('tracking.proof') }}
                    </a>
                  }
                  @if (bultoDelEnvio.numeroDeSeguimiento) {
                    <button
                      type="button"
                      class="btn btn-outline btn-xs min-h-11"
                      (click)="descargaEtiqueta.emit(bultoDelEnvio.secuencia)"
                    >
                      {{ t('admin.shipment.label') }}
                    </button>
                  }
                  @if (anulable(bultoDelEnvio)) {
                    <button
                      type="button"
                      class="btn btn-outline btn-xs min-h-11 hover:border-red-300 hover:text-red-700"
                      (click)="anulaGuia.emit(bultoDelEnvio.secuencia)"
                    >
                      {{ t('admin.shipment.cancel') }}
                    </button>
                  }
                </div>
                <ol class="mt-2 space-y-2">
                  @for (paso of bulto.pasos; track $index) {
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
  /** El número de bulto cuya etiqueta se quiere. La pantalla es la que habla con el backend. */
  readonly descargaEtiqueta = output<number>();
  /** El número de bulto cuya guía se quiere anular. La confirmación la pide la pantalla. */
  readonly anulaGuia = output<number>();

  protected readonly iconoCamion = faTruckFast;
  protected readonly iconoLugar = faLocationDot;
  protected readonly iconoCaja = faBoxOpen;
  protected readonly t = inject(TraduccionService).t;
  private readonly fechas = inject(FormatoDeFecha);

  protected rotuloDeFase(fase: FaseDeEnvio): string {
    return this.t('tracking.phase.' + fase);
  }

  protected enlace(url?: string): string | undefined {
    return enlaceSeguro(url);
  }

  protected anulable(bulto: Bulto): boolean {
    return guiaAnulable(bulto);
  }

  protected coste(valor: NonNullable<Bulto['costeReal']>): string {
    return formateaCosteReal(valor);
  }

  protected fechaYHora(valor: string): string {
    return this.fechas.fechaYHora(valor);
  }

  /**
   * Los bultos con sus pasos ya ordenados. Antes cada repintado volvía a recorrer los sucesos de
   * cada bulto desde la plantilla para pintar exactamente la misma escalera.
   */
  protected readonly bultos = computed(() =>
    this.envio().bultos.map((bulto) => ({ bulto, pasos: pasosDelEnvio(bulto.eventos) })),
  );
  protected readonly pasos = computed(() => pasosDelEnvio(this.envio().eventos));

  /** Sin guía y sin un solo paso no se pinta un recuadro vacío: se calla. */
  protected readonly hayRastro = computed(() => {
    const envio = this.envio();
    return (
      !!envio.numeroDeSeguimiento || envio.eventos.length > 0 || envio.bultos.length > 0
    );
  });

}
