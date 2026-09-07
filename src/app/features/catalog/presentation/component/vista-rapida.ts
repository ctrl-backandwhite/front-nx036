import {
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  resource,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowUpRightFromSquare,
  faCartPlus,
  faChevronLeft,
  faChevronRight,
  faFire,
  faSpinner,
  faStar,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PreferenciasService } from '@core/preferences/preferencias';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { ImagenSegura } from '@ds/component/marcador/imagen-segura';
import { CATALOGO_PORT } from '../../domain/port/catalogo.port';
import { galeriaVisible } from '../../domain/model/galeria';
import { AnadeALaCesta, esMotivoDeRechazo } from '../../application/use-case/anade-a-la-cesta.use-case';
import { EtiquetaPrecio } from './etiqueta-precio';

/** Cuántas miniaturas se enseñan. Más de ocho no caben sin que dejen de reconocerse. */
const MINIATURAS = 8;

/**
 * La ficha de un producto SIN salir de donde estás.
 *
 * <p>Nace de una necesidad concreta: cuando el asistente propone algo, abrir la ficha completa te saca
 * de la página que estabas mirando y pierdes el hilo. Aquí se ve lo mismo —galería, precio, valoración,
 * pedido mínimo y descripción— y se vuelve cerrando.
 *
 * <p>El precio se pinta tal como lo manda el backend. Aquí no se calcula ni se redondea nada: eso ya
 * provocó una vez enseñar un importe y cobrar otro.
 *
 * <p>MOBILE FIRST: en el móvil sube desde abajo y ocupa el ancho, con las esquinas superiores
 * redondeadas —el patrón de hoja que ya se espera—; a partir de `sm` se centra como una ventana.
 */
@Component({
  selector: 'nx-vista-rapida',
  imports: [RouterLink, FaIconComponent, ImagenSegura, EtiquetaPrecio],
  template: `
    @if (slug()) {
      <div
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      >
        <div class="absolute inset-0" (click)="cierra.emit()" aria-hidden="true"></div>
        <div
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="producto()?.titulo ?? t('quickview.title')"
          class="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-base-100 p-4 shadow-2xl sm:max-h-[88vh] sm:rounded-2xl"
        >
          <div class="flex items-start justify-between gap-3">
            <h2 class="text-[15px] font-semibold leading-snug">
              {{ producto()?.titulo ?? t('quickview.title') }}
            </h2>
            <button
              type="button"
              [attr.aria-label]="t('quickview.close')"
              (click)="cierra.emit()"
              class="text-ink-500 hover:text-ink-900 min-h-11 min-w-11 sm:min-h-0 sm:min-w-0"
            >
              <fa-icon [icon]="iconos.aspa" />
            </button>
          </div>

          @if (datos.isLoading()) {
            <p class="py-10 text-center text-sm text-ink-500">{{ t('common.loading') }}</p>
          } @else if (!producto()) {
            <p class="py-10 text-center text-sm text-ink-500">{{ t('quickview.error') }}</p>
          } @else if (producto(); as ficha) {
            <div class="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <div class="relative">
                  <nx-imagen-segura
                    [src]="principal()"
                    [alt]="ficha.titulo"
                    clase="max-h-[38vh] w-full rounded-xl object-cover sm:max-h-none sm:aspect-square"
                    claseMarcador="w-full rounded-xl aspect-square"
                  />
                  @if (cuantas() > 1) {
                    <button
                      type="button"
                      [attr.aria-label]="t('quickview.prev')"
                      (click)="pasa(-1)"
                      class="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-base-100/90 p-2 shadow hover:bg-base-100"
                    >
                      <fa-icon [icon]="iconos.izquierda" class="text-[12px]" />
                    </button>
                    <button
                      type="button"
                      [attr.aria-label]="t('quickview.next')"
                      (click)="pasa(1)"
                      class="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-base-100/90 p-2 shadow hover:bg-base-100"
                    >
                      <fa-icon [icon]="iconos.derecha" class="text-[12px]" />
                    </button>
                    <span
                      class="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] text-white"
                    >
                      {{ indice() + 1 }} / {{ cuantas() }}
                    </span>
                  }
                </div>
                @if (cuantas() > 1) {
                  <div class="mt-2 flex gap-1.5 overflow-x-auto">
                    @for (foto of miniaturas(); track foto.id; let i = $index) {
                      <button
                        type="button"
                        (click)="indice.set(i)"
                        [attr.aria-current]="i === indice()"
                        class="h-12 w-12 shrink-0 overflow-hidden rounded-lg border"
                        [class]="i === indice() ? 'border-brand-700' : 'border-base-300'"
                      >
                        <img [src]="foto.direccion" alt="" class="h-full w-full object-cover" />
                      </button>
                    }
                  </div>
                }
              </div>

              <div class="space-y-3">
                <nx-etiqueta-precio [precio]="ficha.precio" tamano="lg" />

                <div class="flex flex-wrap items-center gap-3 text-[12px] text-ink-500">
                  @if (ficha.valoracion !== undefined) {
                    <span><fa-icon [icon]="iconos.estrella" class="text-amber-500" /> {{ ficha.valoracion }}</span>
                  }
                  @if (ficha.ventasMensuales > 0) {
                    <span><fa-icon [icon]="iconos.fuego" class="text-orange-500" /> {{ ficha.ventasMensuales }}</span>
                  }
                  @if (ficha.moq > 1) {
                    <span>{{ t('quickview.moq') }}: {{ ficha.moq }}</span>
                  }
                </div>

                @if (ficha.descripcion) {
                  <p class="line-clamp-6 whitespace-pre-line text-[12px] text-ink-500">
                    {{ ficha.descripcion }}
                  </p>
                }

                <!-- Añadir desde aquí coge la primera variante CON existencias, igual que la tarjeta
                     del catálogo. Si el producto tiene variantes y ninguna queda, no añade nada y lo
                     dice: es preferible a un pedido con la talla equivocada. -->
                <button
                  type="button"
                  [disabled]="anadiendo()"
                  (click)="anade(ficha)"
                  class="btn btn-primary btn-md w-full text-[13px] sm:btn-sm sm:text-[12px]"
                >
                  <fa-icon
                    [icon]="anadiendo() ? iconos.girando : iconos.carrito"
                    [class.animate-spin]="anadiendo()"
                  />
                  {{ t('quickview.add') }}
                </button>

                <a
                  [routerLink]="['/catalog', ficha.slug]"
                  (click)="cierra.emit()"
                  class="btn btn-outline btn-md w-full text-[13px] sm:btn-sm sm:text-[12px]"
                >
                  <fa-icon [icon]="iconos.abrir" /> {{ t('quickview.open_full') }}
                </a>
              </div>
            </div>
          }
        </div>
      </div>
    }
  `,
  // Escape cierra, como en cualquier ventana modal: sin esto hay que buscar el aspa con el ratón.
  host: { '(document:keydown.escape)': 'cierra.emit()' },
})
export class VistaRapida {
  /** Producto a enseñar. Nulo = cerrada. */
  readonly slug = input<string | null>(null);
  readonly cierra = output<void>();

  private readonly catalogo = inject(CATALOGO_PORT);
  private readonly anadeALaCesta = inject(AnadeALaCesta);
  private readonly avisos = inject(AvisosStore);
  private readonly preferencias = inject(PreferenciasService);

  protected readonly t = inject(TraduccionService).t;
  protected readonly iconos = {
    aspa: faXmark,
    estrella: faStar,
    fuego: faFire,
    carrito: faCartPlus,
    girando: faSpinner,
    abrir: faArrowUpRightFromSquare,
    izquierda: faChevronLeft,
    derecha: faChevronRight,
  };

  /**
   * La foto que se está mirando, que vuelve a la primera al cambiar de producto.
   *
   * <p>Es un `linkedSignal` y no un `signal` con un `effect` detrás: un efecto que solo asigna un valor
   * derivado de otro corre en un orden que no se controla y se ejecuta aunque nadie mire el resultado.
   * Aquí la relación se DECLARA —«cuando cambie el producto, vuelve a la primera»— y entre producto y
   * producto se sigue pudiendo pasar de foto a mano.
   *
   * <p>Sin este reinicio, la ventana se quedaría enseñando la quinta imagen de un producto que quizá
   * solo tiene dos.
   *
   * <p>Va DESPUÉS de `slug`, del que depende: un `linkedSignal` evalúa su origen al construirse.
   */
  protected readonly indice = linkedSignal({
    source: this.slug,
    computation: () => 0,
  });
  protected readonly anadiendo = signal(false);

  protected readonly datos = resource({
    // La moneda entra en la lectura por lo mismo que el idioma: el precio lo pone el backend.
    params: () => ({
      slug: this.slug(),
      idioma: this.preferencias.idioma(),
      moneda: this.preferencias.moneda(),
    }),
    loader: async ({ params }) => {
      if (!params.slug) {
        return null;
      }
      const resultado = await this.catalogo.ficha(params.slug);
      return resultado.ok ? resultado.valor : null;
    },
  });

  protected readonly producto = computed(() => this.datos.value() ?? null);
  protected readonly miniaturas = computed(() =>
    galeriaVisible(this.producto()?.imagenes ?? []).slice(0, MINIATURAS),
  );
  protected readonly cuantas = computed(() => this.miniaturas().length);
  protected readonly principal = computed(
    () => this.miniaturas()[this.indice()]?.direccion ?? this.producto()?.imagenPrincipal,
  );

  /** Da la vuelta en los extremos: llegar a la última y no poder seguir es un callejón sin salida. */
  protected pasa(paso: number): void {
    const total = this.cuantas();
    if (total < 2) {
      return;
    }
    this.indice.update((i) => (i + paso + total) % total);
  }

  protected async anade(ficha: NonNullable<ReturnType<typeof this.producto>>): Promise<void> {
    this.anadiendo.set(true);
    try {
      const resultado = await this.anadeALaCesta.desdeLaTarjeta(ficha);
      if (!resultado.ok) {
        this.avisos.error(
          esMotivoDeRechazo(resultado.error)
            ? this.t('product.variant_out_of_stock')
            : resultado.error.mensaje || this.t('cart.add_failed'),
        );
        return;
      }
      this.avisos.exito(this.t('product.added'));
    } finally {
      this.anadiendo.set(false);
    }
  }
}
