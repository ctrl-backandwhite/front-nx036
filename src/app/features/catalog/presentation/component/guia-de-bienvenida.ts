import { Component, computed, effect, inject, input, output, resource, signal, untracked } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft,
  faArrowRight,
  faBoxOpen,
  faCircleCheck,
  faMinus,
  faPlus,
  faReceipt,
  faTruckFast,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { ALMACEN_LOCAL } from '@core/storage/almacen.port';
import { ImagenSegura } from '@ds/component/marcador/imagen-segura';
import { GUIA_DE_BIENVENIDA_PORT } from '../../domain/port/guia-de-bienvenida.port';

/** Marca de que ya se ha visto. Lleva versión: si la guía cambia de fondo, se vuelve a ofrecer. */
export const CLAVE_VISTA = 'nx036.welcome.v1';
/** Tope de unidades por producto: más allá deja de ser un ejemplo creíble. */
const MAXIMO_UNIDADES = 6;
/** Espera antes de pedir la simulación: subir de 1 a 5 son cinco pulsaciones, no cinco peticiones. */
const ESPERA_MS = 500;

const PASOS = ['intro', 'precio', 'arancel', 'envio', 'tope'] as const;
type Paso = (typeof PASOS)[number];

const ICONO: Record<Paso, IconDefinition> = {
  intro: faBoxOpen,
  precio: faReceipt,
  arancel: faReceipt,
  envio: faTruckFast,
  tope: faCircleCheck,
};

/**
 * La guía de bienvenida: qué se paga al comprar fuera de la Unión, enseñado con números que se tocan.
 *
 * <p>Comprar transfronterizo tiene tres reglas que nadie conoce hasta que le sorprenden en la factura
 * —el arancel se paga por artículo distinto y no por unidad, el envío se paga por pedido, y el
 * transportista no acepta pedidos por encima de cierto valor—. Contarlas en un texto no sirve de nada;
 * se entienden cuando se mueve una cantidad y se ve cambiar el importe.
 *
 * <p>El desglose lo calcula el SERVIDOR, con el mismo servicio que la vista previa del pago: la guía no
 * puede prometer una cifra y el pago cobrar otra. Además, la parte de la subvención que depende de la
 * ganancia del pedido no sale del servidor y el navegador no podría calcularla.
 *
 * <p>REGLA QUE NO SE CRUZA: aquí no se sugiere jamás repartir un pedido en varios. Además de no ahorrar
 * arancel —son las mismas líneas declaradas—, la Unión agrega los envíos de un mismo remitente a un
 * mismo destinatario, así que proponerlo sería dejar por escrito la intención de fraccionar. El consejo
 * de la guía es el contrario: agrupar.
 */
@Component({
  selector: 'nx-guia-de-bienvenida',
  imports: [FaIconComponent, ImagenSegura],
  template: `
    @if (abierta()) {
      <div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
        <!--
          Altura máxima con desplazamiento interno, y no altura libre. El paso del simulador mide unos
          700 píxeles y en un móvil de 667 la ventana se salía por arriba Y por abajo a la vez: quedaban
          fuera tanto los botones de avanzar como el aspa de cerrar, así que quien abría la guía se
          quedaba atrapado dentro. Se mide en «dvh» y no en «vh» porque la barra del navegador aparece y
          desaparece al desplazarse, y «vh» mide siempre la pantalla completa.
        -->
        <div
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="t('welcome.title')"
          class="card bg-base-100 w-full max-w-lg md:max-w-2xl lg:max-w-3xl p-5 md:p-7 space-y-3
                 shadow-xl outline-none max-h-[calc(100dvh-2rem)] overflow-y-auto"
        >
          <div class="flex items-start justify-between gap-3">
            <h2 class="text-lg font-semibold flex items-center gap-2">
              <fa-icon [icon]="icono()" class="text-brand-600" />
              {{ t('welcome.' + pasoActual() + '.title') }}
            </h2>
            <button
              type="button"
              [attr.aria-label]="t('common.close')"
              class="btn btn-sm btn-ghost"
              (click)="cierra()"
            >
              <fa-icon [icon]="iconos.aspa" />
            </button>
          </div>

          <p class="text-sm text-ink-600 whitespace-pre-line">
            {{ t('welcome.' + pasoActual() + '.body') }}
          </p>

          @if (pasoActual() === 'arancel' || pasoActual() === 'envio') {
            @if (productos().length > 0) {
              <div class="mt-2 rounded-md border border-base-200 px-3">
                @for (producto of productos(); track producto.id; let i = $index) {
                  <div class="flex items-center gap-3 py-2 border-b border-base-200 last:border-0">
                    <nx-imagen-segura
                      [src]="producto.imagen"
                      alt=""
                      clase="h-11 w-11 rounded object-cover bg-base-200"
                      claseMarcador="h-11 w-11 rounded"
                    />
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-[13px] leading-tight">{{ producto.titulo }}</p>
                      <p class="text-[11px] text-ink-500">
                        {{ producto.precioFormateado }} · {{ producto.pesoGramos }} g
                      </p>
                    </div>
                    <div class="flex items-center gap-2">
                      <button
                        type="button"
                        [attr.aria-label]="t('welcome.sim.remove_unidad') + ': ' + producto.titulo"
                        class="btn btn-xs btn-ghost min-h-11 sm:min-h-6"
                        [disabled]="unidadesDe(producto.id, i) <= 0"
                        (click)="pon(producto.id, unidadesDe(producto.id, i) - 1)"
                      >
                        <fa-icon [icon]="iconos.menos" />
                      </button>
                      <span class="min-w-5 text-center tabular-nums font-medium">
                        {{ unidadesDe(producto.id, i) }}
                      </span>
                      <button
                        type="button"
                        [attr.aria-label]="t('welcome.sim.add_unidad') + ': ' + producto.titulo"
                        class="btn btn-xs btn-ghost min-h-11 sm:min-h-6"
                        [disabled]="unidadesDe(producto.id, i) >= maximo"
                        (click)="pon(producto.id, unidadesDe(producto.id, i) + 1)"
                      >
                        <fa-icon [icon]="iconos.mas" />
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
            <p class="text-[12px] text-ink-500 mt-2">
              {{ t(pasoActual() === 'arancel' ? 'welcome.arancel.regla' : 'welcome.envio.regla') }}
            </p>
          }

          @if (cuenta(); as desglose) {
            <div class="mt-3 rounded-md bg-base-200/60 p-3 text-sm space-y-1">
              <div class="flex justify-between">
                <span class="opacity-70">{{ t('welcome.sim.subtotal') }}</span>
                <span>{{ desglose.subtotalFormateado }}</span>
              </div>
              <!-- Sin derecho por artículo en el país que mira, esta línea NO existe: pintar «0,00 €»
                   de aduana haría pensar que hay un trámite donde no lo hay. -->
              @if (hayArancel()) {
                <div class="flex justify-between">
                  <span class="opacity-70">{{ t('welcome.sim.duty') }}</span>
                  <span class="font-medium">{{ desglose.arancelFormateado }}</span>
                </div>
              }
              <div class="flex justify-between">
                <span class="opacity-70">{{ t('welcome.sim.shipping') }}</span>
                <span>{{ desglose.envioFormateado }}</span>
              </div>
              <!-- Lo que ponemos nosotros del porte cuando se repiten unidades. Se enseña porque es la
                   mitad de lo que hace inteligente una compra: la segunda unidad viaja casi gratis. -->
              @if (desglose.subsidioDeEnvioFormateado) {
                <div class="flex justify-between text-emerald-600">
                  <span class="pl-3">{{ t('welcome.sim.descuento_envio') }}</span>
                  <span>−{{ desglose.subsidioDeEnvioFormateado }}</span>
                </div>
              }
              <div class="flex justify-between">
                <span class="opacity-70">{{ t('welcome.sim.tax') }}</span>
                <span>{{ desglose.impuestoFormateado }}</span>
              </div>
              <div class="flex justify-between border-t border-base-300 pt-1 mt-1 font-medium">
                <span>{{ t('welcome.sim.total') }}</span>
                <span>{{ desglose.totalFormateado }}</span>
              </div>
              @if (desglose.superaElTope) {
                <p
                  role="alert"
                  class="text-[12px] text-warning-content/90 bg-warning/10 border border-warning/30 rounded p-2 mt-2"
                >
                  {{ t('welcome.tope.aviso') }}
                </p>
              }
            </div>
          }

          <p class="text-[11px] text-ink-500">{{ t('welcome.disclaimer') }}</p>

          <div class="flex items-center justify-between gap-2 pt-1">
            <div class="flex gap-1" aria-hidden="true">
              @for (paso of pasos(); track paso; let i = $index) {
                <span
                  class="h-1.5 w-6 rounded-full"
                  [class]="i <= indice() ? 'bg-brand-500' : 'bg-base-300'"
                ></span>
              }
            </div>
            <div class="flex gap-2">
              @if (indice() > 0) {
                <button type="button" class="btn btn-sm btn-ghost" (click)="atras()">
                  <fa-icon [icon]="iconos.izquierda" /> {{ t('welcome.back') }}
                </button>
              }
              @if (esUltimo()) {
                <button type="button" class="btn btn-sm btn-primary" (click)="cierra()">
                  <fa-icon [icon]="iconos.hecho" /> {{ t('welcome.finish') }}
                </button>
              } @else {
                <button type="button" class="btn btn-sm btn-primary" (click)="adelante()">
                  {{ t('welcome.next') }} <fa-icon [icon]="iconos.derecha" />
                </button>
              }
            </div>
          </div>
        </div>
      </div>
    }
  `,
  host: { '(document:keydown.escape)': 'cierra()' },
})
export class GuiaDeBienvenida {
  /** La abre quien la presenta: hoy, el asistente. Ya NO se abre sola en la primera visita. */
  readonly abrir = input(false);
  readonly cerrada = output<void>();

  private readonly puerto = inject(GUIA_DE_BIENVENIDA_PORT);
  private readonly almacen = inject(ALMACEN_LOCAL);

  protected readonly t = inject(TraduccionService).t;
  protected readonly maximo = MAXIMO_UNIDADES;
  protected readonly iconos = {
    aspa: faXmark,
    menos: faMinus,
    mas: faPlus,
    izquierda: faArrowLeft,
    derecha: faArrowRight,
    hecho: faCircleCheck,
  };

  protected readonly abierta = signal(false);
  protected readonly indice = signal(0);
  private readonly unidades = signal<Readonly<Record<string, number>>>({});

  /** Los ejemplos solo hacen falta con la guía abierta: no se pide nada al cargar la página. */
  private readonly ejemplos = resource({
    params: () => ({ abierta: this.abierta() }),
    loader: async ({ params }) => {
      if (!params.abierta) {
        return null;
      }
      const resultado = await this.puerto.ejemplos();
      return resultado.ok ? resultado.valor : null;
    },
  });

  protected readonly productos = computed(() => this.ejemplos.value()?.ejemplos ?? []);
  protected readonly hayArancel = computed(
    () => !!this.ejemplos.value()?.derechoPorPartidaFormateado,
  );

  /**
   * Los pasos que tocan a este visitante. El arancel por partida es del derecho de la Unión:
   * contárselo a quien compra desde fuera sería explicarle una regla que no le aplica y dejarle
   * esperando un cobro que no existe. Se reconoce por el mismo dato que decide todo lo demás del
   * arancel, para no mantener una segunda lista de países.
   */
  protected readonly pasos = computed<readonly Paso[]>(() =>
    this.hayArancel() ? PASOS : PASOS.filter((paso) => paso !== 'arancel'),
  );

  /** Si la lista se acorta al llegar la respuesta, el índice podría quedar fuera: se acota al pintar. */
  protected readonly pasoActual = computed(
    () => this.pasos()[Math.min(this.indice(), this.pasos().length - 1)],
  );
  protected readonly icono = computed(() => ICONO[this.pasoActual()]);
  protected readonly esUltimo = computed(() => this.indice() >= this.pasos().length - 1);

  private readonly lineas = computed(() =>
    this.productos()
      .map((producto, i) => ({ productId: producto.id, quantity: this.unidadesDe(producto.id, i) }))
      .filter((linea) => linea.quantity > 0),
  );

  private readonly simulacion = signal<Awaited<
    ReturnType<typeof this.puerto.simula>
  > | null>(null);

  protected readonly cuenta = computed(() => {
    const resultado = this.simulacion();
    return resultado?.ok ? resultado.valor : null;
  });

  private espera: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    effect(() => {
      if (this.abrir()) {
        untracked(() => this.abierta.set(true));
      }
    });

    effect(() => {
      const lineas = this.lineas();
      untracked(() => this.pideLaSimulacion(lineas));
    });
  }

  protected unidadesDe(id: string, posicion: number): number {
    // Arranca con una unidad del primero para que el desglose nazca con contenido: un simulador en
    // blanco no enseña nada y obliga a adivinar que hay que pulsar algo.
    return this.unidades()[id] ?? (posicion === 0 ? 1 : 0);
  }

  protected pon(id: string, valor: number): void {
    this.unidades.update((actuales) => ({
      ...actuales,
      [id]: Math.min(MAXIMO_UNIDADES, Math.max(0, valor)),
    }));
  }

  protected atras(): void {
    this.indice.update((i) => Math.max(0, i - 1));
  }

  protected adelante(): void {
    this.indice.update((i) => Math.min(this.pasos().length - 1, i + 1));
  }

  protected cierra(): void {
    if (!this.abierta()) {
      return;
    }
    // Que no se pueda guardar da igual: lo peor que pasa es que vuelva a ofrecerse.
    this.almacen.guarda(CLAVE_VISTA, new Date().toISOString());
    this.abierta.set(false);
    this.cerrada.emit();
  }

  private pideLaSimulacion(
    lineas: readonly { productId: string; quantity: number }[],
  ): void {
    clearTimeout(this.espera);
    if (!this.abierta() || lineas.length === 0) {
      this.simulacion.set(null);
      return;
    }
    this.espera = setTimeout(async () => {
      this.simulacion.set(await this.puerto.simula(lineas));
    }, ESPERA_MS);
  }
}
