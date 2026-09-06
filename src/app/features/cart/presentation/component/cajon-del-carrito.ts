import { Component, DOCUMENT, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowRight,
  faBookmark,
  faBoxOpen,
  faCartArrowDown,
  faCartShopping,
  faTrash,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { ImagenSegura } from '@ds/component/marcador/imagen-segura';
import { claveDeLinea } from '../../domain/model/linea-de-carrito';
import { CarritoStore } from '../../application/state/carrito.store';
import { CotizaElCarrito } from '../../application/use-case/cotiza-el-carrito.use-case';
import { AccionesDeLinea } from '../acciones-de-linea';
import { AvisoDeMinimoComponent } from './aviso-de-minimo';

/** Lo que dura la animación de cierre. Tiene que coincidir con la del CSS o el panel desaparece de golpe. */
const CIERRE_MS = 500;

/**
 * El cajón lateral de la cesta.
 *
 * <p>Su estado vive en el almacén del contexto para que cualquier marco de página —escaparate o panel—
 * pueda abrirlo sin pasarse propiedades de padre a hijo.
 *
 * <p>Se mantiene MONTADO durante el cierre para poder reproducir la animación inversa: `montado` controla
 * si existe y `cerrando` la dirección. Desmontarlo al pulsar haría desaparecer el panel de golpe.
 *
 * <p>Mientras está abierto se bloquea el desplazamiento del documento: sin eso, arrastrar dentro del panel
 * mueve la página de detrás, y al cerrar se ha perdido el sitio donde se estaba.
 */
@Component({
  selector: 'nx-cajon-del-carrito',
  imports: [RouterLink, FaIconComponent, ImagenSegura, AvisoDeMinimoComponent],
  providers: [AccionesDeLinea],
  host: { '(document:keydown.escape)': 'cierra()' },
  template: `
    @if (montado()) {
      <div
        class="fixed inset-0 z-[80]"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="t('cart.title')"
      >
        <div
          class="absolute inset-0 bg-black/40"
          [class]="cerrando() ? 'animate-[fade-out_500ms_ease-out_forwards]' : 'animate-[fade-in_500ms_ease-out]'"
          (click)="cierra()"
          (keydown.enter)="cierra()"
          tabindex="-1"
          role="presentation"
        ></div>
        <aside
          class="absolute right-0 top-0 h-full w-full max-w-md bg-base-100 shadow-xl flex flex-col"
          [class]="cerrando() ? 'animate-[slide-out-right_500ms_ease-out_forwards]' : 'animate-[slide-in-right_500ms_ease-out]'"
        >
          <header class="navbar bg-base-100 border-b border-base-200 min-h-14 px-5">
            <h2 class="flex-1 font-medium flex items-center gap-2">
              <fa-icon [icon]="iconoCesta" class="text-primary" />
              {{ t('cart.title') }}
              @if (estado.lineas().length > 0) {
                <span class="text-[12px] opacity-60 font-normal">({{ estado.unidades() }})</span>
              }
            </h2>
            <!-- «desde» cuando alguna línea no tiene peso real: sin esa palabra quien compra tomaría
                 por exacto un número al que le falta parte. -->
            @if (cotizacion.pesoTotal(); as peso) {
              <span class="text-[12px] text-ink-500 mr-2 whitespace-nowrap">
                {{ cotizacion.pesoIncompleto() ? tCon('cart.weight_from', { w: peso }) : peso }}
              </span>
            }
            <button
              type="button"
              class="btn btn-ghost btn-sm btn-square"
              [attr.aria-label]="t('cart.close')"
              (click)="cierra()"
            >
              <fa-icon [icon]="iconoCerrar" />
            </button>
          </header>

          <div class="flex-1 overflow-y-auto px-4 py-3 scrollbar-thin">
            @if (estado.lineas().length === 0 && estado.guardadas().length === 0) {
              <div class="hero py-16">
                <div class="hero-content text-center flex-col">
                  <fa-icon [icon]="iconoVacio" class="text-4xl opacity-30 mb-3" />
                  <p class="font-medium">{{ t('cart.empty.title') }}</p>
                  <p class="text-[12px] opacity-70 mt-1">{{ t('cart.empty.body') }}</p>
                  <a routerLink="/catalog" class="btn btn-outline btn-sm mt-2" (click)="cierra()">
                    {{ t('cart.empty.cta') }}
                  </a>
                </div>
              </div>
            } @else if (estado.lineas().length > 0) {
              @if (acciones.aviso(); as aviso) {
                <div class="mb-3">
                  <nx-aviso-de-minimo
                    [aviso]="aviso"
                    (sacaElProducto)="acciones.sacaElProductoEntero()"
                    (descarta)="acciones.descartaElAviso()"
                  />
                </div>
              }
              <ul class="space-y-3">
                @for (linea of estado.lineas(); track clave(linea)) {
                  <li class="flex gap-3 border-b border-base-200 pb-3 last:border-b-0">
                    <a [routerLink]="['/catalog', linea.slug]" class="shrink-0" (click)="cierra()">
                      <nx-imagen-segura
                        [src]="linea.imagen"
                        [alt]="linea.titulo"
                        clase="w-16 h-16 rounded-md object-cover"
                        claseMarcador="w-16 h-16 rounded-md"
                      />
                    </a>
                    <div class="flex-1 min-w-0">
                      <a
                        [routerLink]="['/catalog', linea.slug]"
                        class="text-[13px] font-medium line-clamp-2 hover:text-primary"
                        (click)="cierra()"
                        >{{ linea.titulo }}</a
                      >
                      @if (linea.etiquetaDeVariante || linea.sku) {
                        <div class="text-[11px] opacity-60 mt-0.5 truncate">
                          {{ linea.etiquetaDeVariante }}
                          @if (linea.etiquetaDeVariante && linea.sku) {
                            <span> · </span>
                          }
                          @if (linea.sku) {
                            <span>SKU {{ linea.sku }}</span>
                          }
                        </div>
                      }
                      <div class="text-[11px] opacity-60 mt-0.5">
                        {{ cotizacion.pesoDeLinea(linea) ?? t('cart.weight_pending') }}
                      </div>
                      <div class="flex items-center justify-between mt-1.5">
                        <div class="join">
                          <button
                            type="button"
                            class="btn btn-xs join-item"
                            [attr.aria-label]="t('cart.qty.decrease')"
                            (click)="acciones.bajaUna(linea)"
                          >
                            −
                          </button>
                          <span class="btn btn-xs join-item no-animation pointer-events-none">{{
                            linea.cantidad
                          }}</span>
                          <button
                            type="button"
                            class="btn btn-xs join-item"
                            [attr.aria-label]="t('cart.qty.increase')"
                            (click)="acciones.subeUna(linea)"
                          >
                            +
                          </button>
                        </div>
                        <span class="text-[13px] font-medium">{{
                          cotizacion.totalDeLinea(linea)
                        }}</span>
                      </div>
                      <div class="flex items-center gap-3 mt-1">
                        <button
                          type="button"
                          class="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
                          (click)="acciones.saca(linea, 'apartar')"
                        >
                          <fa-icon [icon]="iconoGuardar" /> {{ t('cart.save_for_later') }}
                        </button>
                        <button
                          type="button"
                          class="text-[11px] text-error hover:underline inline-flex items-center gap-1"
                          (click)="acciones.saca(linea, 'quitar')"
                        >
                          <fa-icon [icon]="iconoBorrar" /> {{ t('cart.remove') }}
                        </button>
                      </div>
                    </div>
                  </li>
                }
              </ul>
            }

            @if (estado.guardadas().length > 0) {
              <div [class.mt-4]="estado.lineas().length > 0" [class.pt-3]="estado.lineas().length > 0"
                   [class.border-t]="estado.lineas().length > 0" [class.border-base-200]="estado.lineas().length > 0">
                <div class="text-[12px] font-medium flex items-center gap-2 mb-2">
                  <fa-icon [icon]="iconoGuardar" class="text-primary" />
                  {{ t('cart.saved_title') }}
                  <span class="opacity-60 font-normal">({{ estado.guardadas().length }})</span>
                </div>
                <ul class="space-y-2">
                  @for (linea of estado.guardadas(); track clave(linea)) {
                    <li class="flex gap-2 items-center">
                      <a [routerLink]="['/catalog', linea.slug]" class="shrink-0" (click)="cierra()">
                        <nx-imagen-segura
                          [src]="linea.imagen"
                          [alt]="linea.titulo"
                          clase="w-10 h-10 rounded object-cover"
                          claseMarcador="w-10 h-10 rounded"
                        />
                      </a>
                      <div class="flex-1 min-w-0">
                        <div class="text-[12px] line-clamp-1">{{ linea.titulo }}</div>
                        <div class="text-[10px] opacity-60">
                          {{ cotizacionGuardadas.totalDeLinea(linea) }}
                        </div>
                      </div>
                      <button
                        type="button"
                        class="btn btn-outline btn-xs gap-1"
                        [attr.aria-label]="t('cart.move_to_cart')"
                        (click)="acciones.devuelveALaCesta(linea)"
                      >
                        <fa-icon [icon]="iconoDevolver" />
                      </button>
                    </li>
                  }
                </ul>
              </div>
            }
          </div>

          @if (estado.lineas().length > 0) {
            <footer class="border-t border-base-200 px-5 py-4 space-y-3">
              <div class="stat px-0 py-1">
                <div class="stat-title text-[11px]">{{ t('cart.subtotal') }}</div>
                <div class="stat-value text-2xl">{{ cotizacion.subtotal() }}</div>
              </div>
              <a routerLink="/checkout" class="btn btn-primary w-full" (click)="cierra()">
                {{ t('cart.checkout') }} <fa-icon [icon]="iconoSeguir" />
              </a>
              <a
                routerLink="/cart"
                class="btn btn-outline btn-sm w-full text-[12px]"
                (click)="cierra()"
                >{{ t('cart.view_full') }}</a
              >
            </footer>
          }
        </aside>
      </div>
    }
  `,
})
export class CajonDelCarrito {
  protected readonly estado = inject(CarritoStore);
  protected readonly acciones = inject(AccionesDeLinea);

  private readonly traduccion = inject(TraduccionService);
  protected readonly t = this.traduccion.t;
  protected readonly tCon = this.traduccion.tCon;

  private readonly cotizador = inject(CotizaElCarrito);
  protected readonly cotizacion = this.cotizador.para(this.estado.lineas);
  protected readonly cotizacionGuardadas = this.cotizador.para(this.estado.guardadas);

  private readonly documento = inject(DOCUMENT);

  private readonly _cerrando = signal(false);
  protected readonly cerrando = this._cerrando.asReadonly();
  /** Existe mientras esté abierto, y un poco más: lo que dura la animación de salida. */
  protected readonly montado = computed(() => this.estado.cajonAbierto() || this._cerrando());

  private temporizador: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    effect(() => {
      const abierto = this.estado.cajonAbierto();
      if (abierto) {
        clearTimeout(this.temporizador);
        this._cerrando.set(false);
      }
      // El bloqueo se pone y se quita en el mismo sitio: repartirlo entre el abrir y el cerrar dejaba la
      // página bloqueada para siempre si el panel se cerraba por una navegación.
      this.documento.body.style.overflow = abierto ? 'hidden' : '';
    });
  }

  protected cierra(): void {
    if (!this.estado.cajonAbierto()) {
      return;
    }
    this._cerrando.set(true);
    this.estado.cierraCajon();
    this.temporizador = setTimeout(() => this._cerrando.set(false), CIERRE_MS);
  }

  protected readonly clave = claveDeLinea;
  protected readonly iconoCesta = faCartShopping;
  protected readonly iconoCerrar = faXmark;
  protected readonly iconoVacio = faBoxOpen;
  protected readonly iconoGuardar = faBookmark;
  protected readonly iconoBorrar = faTrash;
  protected readonly iconoDevolver = faCartArrowDown;
  protected readonly iconoSeguir = faArrowRight;
}
