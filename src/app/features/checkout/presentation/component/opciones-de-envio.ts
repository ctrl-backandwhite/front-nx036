import { Component, computed, inject, input, output, signal } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import {
  OpcionDeEnvio,
  categoriaDeOpcion,
  laMasBarata,
  laMasRapida,
} from '../../domain/model/cotizacion-de-envio';

/**
 * Cuántas formas de envío se ven sin pedirlo.
 *
 * <p>El backend ya recorta a las cinco más baratas, pero cinco tarjetas abiertas empujan el botón de pagar
 * fuera de la pantalla en un móvil. Se enseñan las tres primeras —que por el orden del backend son las tres
 * más baratas— y las demás quedan a un toque, sin esconder nada: el botón dice cuántas faltan.
 */
const VISIBLES_POR_DEFECTO = 3;

/**
 * El selector de forma de envío.
 *
 * <p>Detrás de cada opción hay un canal del transportista, pero su código NO se enseña: «FZZXR» o
 * «云途全球服装专线挂号» no le dicen nada a nadie. Se elige por lo único que importa —cuánto tarda y cuánto
 * cuesta— y el código viaja de vuelta para emitir la guía por el mismo canal que se cotizó.
 *
 * <p>Los precios llegan YA formateados por el backend en la divisa de quien compra: aquí no se convierte
 * ni se redondea nada.
 */
@Component({
  selector: 'nx-opciones-de-envio',
  template: `
    <section class="space-y-2" role="radiogroup" [attr.aria-label]="t('checkout.shipping_option.title')">
      <div class="text-xs font-medium opacity-70">{{ t('checkout.shipping_option.title') }}</div>
      <div class="space-y-1.5">
        @for (opcion of visibles(); track opcion.codigo) {
          <label
            class="card p-3 text-sm cursor-pointer transition-colors flex items-start gap-2"
            [class.border-brand-500]="opcion.codigo === seleccionada()"
            [class.ring-2]="opcion.codigo === seleccionada()"
            [class.ring-brand-100]="opcion.codigo === seleccionada()"
            [class.hover:border-ink-300]="opcion.codigo !== seleccionada()"
          >
            <input
              type="radio"
              name="forma-de-envio"
              class="mt-1"
              [value]="opcion.codigo"
              [checked]="opcion.codigo === seleccionada()"
              (change)="elige.emit(opcion.codigo)"
            />
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2">
                <span class="font-medium">{{
                  t('checkout.shipping_option.' + categoria(opcion))
                }}</span>
                <span class="font-medium whitespace-nowrap">{{ opcion.importeFormateado }}</span>
              </div>
              <div class="text-xs text-ink-500 mt-0.5">
                <!-- Con quién viaja el paquete. El nombre llega ya presentable del backend para que se
                     llame igual aquí, en la ficha del pedido y en los correos. -->
                @if (opcion.transportista) {
                  <span class="font-medium">{{ opcion.transportista }}</span>
                  <span> · </span>
                }
                {{ plazo(opcion) }}
              </div>
              @if (opcion.codigo === codigoMasBarata() || opcion.codigo === codigoMasRapida()) {
                <div class="mt-1 flex flex-wrap gap-1">
                  @if (opcion.codigo === codigoMasBarata()) {
                    <span class="badge bg-brand-50 text-brand-700">{{
                      t('checkout.shipping_option.cheapest')
                    }}</span>
                  }
                  @if (opcion.codigo === codigoMasRapida()) {
                    <span class="badge bg-emerald-50 text-emerald-700">{{
                      t('checkout.shipping_option.fastest')
                    }}</span>
                  }
                </div>
              }
            </div>
          </label>
        }
      </div>
      @if (escondidas().length > 0 && !seleccionEscondida()) {
        <button
          type="button"
          class="text-xs font-medium text-brand-600 hover:text-brand-700 hover:underline"
          (click)="alterna()"
        >
          {{
            abierto()
              ? t('checkout.shipping_option.show_less')
              : tCon('checkout.shipping_option.show_more', { count: escondidas().length })
          }}
        </button>
      }
    </section>
  `,
})
export class OpcionesDeEnvio {
  readonly opciones = input.required<readonly OpcionDeEnvio[]>();
  /** El canal con el que el SERVIDOR está cotizando, que no siempre es el que se pulsó. */
  readonly seleccionada = input<string | undefined>(undefined);
  readonly elige = output<string>();

  private readonly traduccion = inject(TraduccionService);
  protected readonly t = this.traduccion.t;
  protected readonly tCon = this.traduccion.tCon;

  private readonly desplegado = signal(false);

  protected readonly escondidas = computed(() => this.opciones().slice(VISIBLES_POR_DEFECTO));

  /**
   * El servidor RECOTIZA al confirmar y puede quedarse con un canal que no está entre los tres primeros.
   * Dejarlo plegado enseñaría una lista sin ninguna opción marcada: no se sabría qué se ha elegido ni por
   * qué se cobra ese envío. En ese caso nace abierta y no se puede plegar.
   */
  protected readonly seleccionEscondida = computed(() =>
    this.escondidas().some((opcion) => opcion.codigo === this.seleccionada()),
  );

  protected readonly abierto = computed(() => this.desplegado() || this.seleccionEscondida());

  protected readonly visibles = computed(() =>
    this.abierto() ? this.opciones() : this.opciones().slice(0, VISIBLES_POR_DEFECTO),
  );

  /**
   * Las insignias se calculan sobre TODAS las opciones y no sobre las visibles: si la más rápida está
   * plegada, rotular como «la más rápida» a una de las tres de arriba sería mentir sobre el plazo.
   */
  protected readonly codigoMasBarata = computed(() =>
    this.opciones().length > 1 ? laMasBarata(this.opciones()).codigo : undefined,
  );

  protected readonly codigoMasRapida = computed(() =>
    this.opciones().length > 1 ? laMasRapida(this.opciones()).codigo : undefined,
  );

  protected categoria(opcion: OpcionDeEnvio): string {
    return categoriaDeOpcion(opcion, this.opciones());
  }

  protected plazo(opcion: OpcionDeEnvio): string {
    return this.tCon('checkout.shipping_option.eta', {
      min: opcion.diasMinimos,
      max: opcion.diasMaximos,
    });
  }

  protected alterna(): void {
    this.desplegado.set(!this.desplegado());
  }
}
