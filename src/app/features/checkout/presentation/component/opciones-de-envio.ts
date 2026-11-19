import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import {
  EleccionDeEnvio,
  OpcionDeEnvio,
  categoriaDeOpcion,
  claveDeOpcion,
  esLaElegida,
  laMasBarata,
  laMasRapida,
} from '../../domain/model/cotizacion-de-envio';
import { rotuloDelCanal } from './rotulo-del-canal';

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
  // Nace en BLOQUE: un elemento personalizado es `inline` por defecto y un inline ignora
  // los márgenes verticales, así que bajo un contenedor con `space-y` se pega al de al lado.
  host: { class: 'block' },
  selector: 'nx-opciones-de-envio',
  imports: [NgTemplateOutlet],
  template: `
    <section class="space-y-2" role="radiogroup" [attr.aria-label]="t('checkout.shipping_option.title')">
      <div class="text-xs font-medium opacity-70">{{ t('checkout.shipping_option.title') }}</div>
      <div class="space-y-2">
        @for (opcion of visibles(); track clave(opcion)) {
          @if (unica()) {
            <!-- Una sola forma de envío: es información, no una elección. Sin botón, y por eso no es
                 una etiqueta de formulario. -->
            <div class="card flex-row p-4 text-sm flex items-start gap-3">
              <ng-container [ngTemplateOutlet]="fila" [ngTemplateOutletContext]="{ $implicit: opcion }" />
            </div>
          } @else {
            <label
              class="card flex-row p-4 text-sm cursor-pointer transition-colors flex items-start gap-3"
              [class.border-brand-500]="esLaSeleccionada(opcion)"
              [class.ring-2]="esLaSeleccionada(opcion)"
              [class.ring-brand-100]="esLaSeleccionada(opcion)"
              [class.hover:border-ink-300]="!esLaSeleccionada(opcion)"
            >
              <input
                type="radio"
                name="forma-de-envio"
                class="mt-1"
                [value]="opcion.codigo"
                [checked]="esLaSeleccionada(opcion)"
                (change)="elige.emit({ codigo: opcion.codigo, idDeTransportista: opcion.idDeTransportista })"
              />
              <ng-container [ngTemplateOutlet]="fila" [ngTemplateOutletContext]="{ $implicit: opcion }" />
            </label>
          }
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
      <ng-template #fila let-opcion>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2">
                <span class="font-medium">{{
                  t('checkout.shipping_option.' + categoria(opcion))
                }}</span>
                <span class="font-semibold whitespace-nowrap">{{ opcion.importeFormateado }}</span>
              </div>
              <div class="text-xs text-ink-500 mt-0.5">
                <!-- Con quién viaja el paquete. El nombre llega ya presentable del backend para que se
                     llame igual aquí, en la ficha del pedido y en los correos. -->
                @if (rotulo(opcion); as rotulo) {
                  <span class="font-medium" data-testid="opcion-canal">{{ rotulo }}</span>
                  <span> · </span>
                }
                {{ plazo(opcion) }}
              </div>
              @if (!unica() && (clave(opcion) === claveMasBarata() || clave(opcion) === claveMasRapida())) {
                <div class="mt-2 flex flex-wrap gap-1.5">
                  @if (clave(opcion) === claveMasBarata()) {
                    <span class="badge bg-brand-50 text-brand-700">{{
                      t('checkout.shipping_option.cheapest')
                    }}</span>
                  }
                  @if (clave(opcion) === claveMasRapida()) {
                    <span class="badge bg-emerald-50 text-emerald-700">{{
                      t('checkout.shipping_option.fastest')
                    }}</span>
                  }
                </div>
              }
            </div>
      </ng-template>
    </section>
  `,
})
export class OpcionesDeEnvio {
  readonly opciones = input.required<readonly OpcionDeEnvio[]>();
  /** El canal con el que el SERVIDOR está cotizando, que no siempre es el que se pulsó. */
  readonly seleccionada = input<string | undefined>(undefined);
  /** El transportista con el que el SERVIDOR cotiza: junto al código, identifica la opción marcada. */
  readonly transportistaSeleccionado = input<string | undefined>(undefined);
  readonly elige = output<EleccionDeEnvio>();

  /**
   * Una sola forma de envío no es una elección, pero SÍ es información.
   *
   * <p>Hasta el 11-nov-2026 la página ni montaba este componente con una opción: «una lista de un
   * elemento solo estorba». Era cierto con un transportista. Con dos, esa fila es el único sitio donde
   * el comprador ve QUIÉN lleva su paquete — y el transportista decide si los impuestos van incluidos
   * o se pagan en la puerta. Medido en Serbia, que solo cubre 4PX: el nombre no salía en ninguna parte.
   *
   * <p>Por eso se pinta, pero sin botón que elegir ni insignias de «más barata» y «más rápida», que
   * con una sola fila no comparan con nada.
   */
  protected readonly unica = computed(() => this.opciones().length === 1);

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
    this.escondidas().some((opcion) => this.esLaSeleccionada(opcion)),
  );

  protected readonly abierto = computed(() => this.desplegado() || this.seleccionEscondida());

  protected readonly visibles = computed(() =>
    this.abierto() ? this.opciones() : this.opciones().slice(0, VISIBLES_POR_DEFECTO),
  );

  /**
   * Las insignias se calculan sobre TODAS las opciones y no sobre las visibles: si la más rápida está
   * plegada, rotular como «la más rápida» a una de las tres de arriba sería mentir sobre el plazo.
   */
  protected readonly claveMasBarata = computed(() =>
    this.opciones().length > 1 ? claveDeOpcion(laMasBarata(this.opciones())) : undefined,
  );

  protected readonly claveMasRapida = computed(() =>
    this.opciones().length > 1 ? claveDeOpcion(laMasRapida(this.opciones())) : undefined,
  );

  protected clave(opcion: OpcionDeEnvio): string {
    return claveDeOpcion(opcion);
  }

  protected esLaSeleccionada(opcion: OpcionDeEnvio): boolean {
    return esLaElegida(opcion, this.seleccionada(), this.transportistaSeleccionado());
  }

  /** «Línea de ropa · YunExpress»; el código del canal no se enseña. */
  protected rotulo(opcion: OpcionDeEnvio): string | undefined {
    return rotuloDelCanal(opcion, this.t);
  }

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
