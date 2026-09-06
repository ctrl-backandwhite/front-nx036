import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBan,
  faCheckCircle,
  faChevronRight,
  faTrashCan,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import {
  Cotizacion,
  SolicitudDeAprovisionamiento,
  sePuedeCancelar,
  sePuedeElegirCotizacion,
} from '../../domain/model/aprovisionamiento';
import { TasaDeCambio, formateaImporte } from '../../domain/model/tasa-de-cambio';

/**
 * Una solicitud de aprovisionamiento con sus cotizaciones plegadas.
 *
 * <p>Las cotizaciones solo se piden al desplegar: una lista de veinte solicitudes son veinte peticiones
 * que casi nadie mira. Quien las trae es la pantalla; aquí solo se avisa de que hacen falta.
 */
@Component({
  selector: 'nx-tarjeta-de-solicitud',
  imports: [FaIconComponent],
  template: `
    <div class="card p-4">
      <div class="flex items-start justify-between gap-3">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="badge font-medium border" [class]="clasesDelEstado()">
              {{ t('sourcing.status.' + solicitud().estado) }}
            </span>
            @if (solicitud().origen; as origen) {
              <span class="text-[11px] uppercase tracking-wider text-ink-500">{{ origen }}</span>
            }
            <span class="text-[11px] text-ink-400">{{ creada() }}</span>
          </div>

          <!--
            noreferrer además de noopener: el enlace sale a un mercado ajeno y no hay motivo para
            decirle desde qué página del panel se ha llegado.
          -->
          <a
            [href]="solicitud().urlDeOrigen"
            target="_blank"
            rel="noopener noreferrer"
            class="text-[13px] text-brand-700 hover:underline break-all line-clamp-1"
          >
            {{ solicitud().urlDeOrigen }}
          </a>
          @if (solicitud().tituloOrientativo; as titulo) {
            <div class="text-[13px] mt-1">{{ titulo }}</div>
          }
        </div>

        <div class="flex items-center gap-1">
          <button type="button" class="btn btn-outline text-[11px]" (click)="alterna()">
            {{ solicitud().cuantasCotizaciones }} {{ t('sourcing.quotes') }}
            <fa-icon
              [icon]="iconos.flecha"
              class="text-[10px] ml-1 transition-transform"
              [class.rotate-90]="desplegada()"
            />
          </button>
          @if (sePuedeCancelar()) {
            <button
              type="button"
              class="btn btn-ghost btn-square text-[11px]"
              [attr.aria-label]="t('actions.cancel')"
              [title]="t('actions.cancel')"
              (click)="cancela.emit()"
            >
              <fa-icon [icon]="iconos.prohibido" />
            </button>
          }
          <button
            type="button"
            class="btn btn-ghost btn-square text-[11px] text-error"
            [attr.aria-label]="t('actions.delete')"
            [title]="t('actions.delete')"
            (click)="elimina.emit()"
          >
            <fa-icon [icon]="iconos.papelera" />
          </button>
        </div>
      </div>

      @if (desplegada() && cotizaciones().length > 0) {
        <div class="mt-3 space-y-2 border-t border-ink-100 pt-3">
          @for (cotizacion of cotizaciones(); track cotizacion.id) {
            <div class="flex items-center gap-3 text-[13px]">
              <div class="flex-1 min-w-0">
                <div class="font-medium">
                  {{ cotizacion.agente?.nombre ?? t('sourcing.agent') }}
                  <span class="text-[10px] text-ink-500">({{ cotizacion.agente?.categoria }})</span>
                </div>
                @if (cotizacion.notas; as notas) {
                  <div class="text-[11px] text-ink-500 line-clamp-1">{{ notas }}</div>
                }
              </div>
              <div class="text-right">
                <div class="font-medium">{{ precio(cotizacion) }}</div>
                <div class="text-[10px] text-ink-500">
                  {{ t('sourcing.eta') }} {{ cotizacion.diasEstimados }}d
                </div>
              </div>
              @if (sePuedeElegir()) {
                <button
                  type="button"
                  class="btn btn-outline text-[11px]"
                  (click)="elige.emit(cotizacion.id)"
                >
                  <fa-icon [icon]="iconos.correcto" /> {{ t('sourcing.select_quote') }}
                </button>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class TarjetaDeSolicitud {
  readonly solicitud = input.required<SolicitudDeAprovisionamiento>();
  readonly cotizaciones = input<readonly Cotizacion[]>([]);
  readonly tasas = input<readonly TasaDeCambio[]>([]);
  /** La divisa en la que quiere ver los importes quien mira. */
  readonly divisa = input('USD');

  readonly despliega = output<void>();
  readonly elige = output<string>();
  readonly cancela = output<void>();
  readonly elimina = output<void>();

  protected readonly t = inject(TraduccionService).t;
  private readonly traduccion = inject(TraduccionService);

  protected readonly desplegada = signal(false);

  protected readonly iconos = {
    flecha: faChevronRight,
    correcto: faCheckCircle,
    prohibido: faBan,
    papelera: faTrashCan,
  };

  protected readonly sePuedeCancelar = computed(() => sePuedeCancelar(this.solicitud()));
  protected readonly sePuedeElegir = computed(() => sePuedeElegirCotizacion(this.solicitud()));

  /** El color del estado. Con borde, porque sobre fondo neutro el relleno solo no se distingue. */
  protected readonly clasesDelEstado = computed(() => {
    switch (this.solicitud().estado) {
      case 'APPROVED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'QUOTING':
        return 'bg-brand-50 text-brand-800 border-brand-200';
      default:
        return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  });

  protected readonly creada = computed(() => {
    const cuando = new Date(this.solicitud().creadaEl);
    return Number.isNaN(cuando.getTime()) ? this.solicitud().creadaEl : cuando.toLocaleString();
  });

  protected alterna(): void {
    const abriendo = !this.desplegada();
    this.desplegada.set(abriendo);
    if (abriendo) {
      this.despliega.emit();
    }
  }

  /**
   * El precio llega en céntimos de DÓLAR y se enseña en la divisa activa, como en el resto de
   * pantallas. La conversión no se hace aquí: la trae quien monta la tarjeta con la tabla del día.
   */
  protected precio(cotizacion: Cotizacion): string {
    const dolares = cotizacion.precioEnCentimosUsd / 100;
    const tasa = this.tasas().find((t) => t.codigo === this.divisa())?.porDolar ?? 1;
    return formateaImporte(dolares * tasa, this.divisa(), this.traduccion.idioma());
  }
}
