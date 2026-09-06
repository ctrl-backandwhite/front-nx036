import { Component, DestroyRef, computed, inject, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PreferenciasService } from '@core/preferences/preferencias';
import { ImagenSegura } from '@ds/component/marcador/imagen-segura';
import { PROMOCIONES_PORT } from '../../domain/port/promociones.port';
import { diasQueQuedan } from '../../domain/model/catalogo-auxiliar';

/** Cada cuánto pasa a la siguiente rebaja. */
const PASE_MS = 6000;
/** La entrada se retrasa para que el cartel se deslice sobre una portada YA pintada. */
const ENTRADA_MS = 250;

/**
 * El cartel de rebajas de la portada.
 *
 * <p>Anuncia las promociones vigentes con una tira de los productos a los que alcanzan. Si no hay
 * ninguna viva no ocupa NI UN PÍXEL: un hueco vacío sería peor que no tener cartel.
 *
 * <p>«Hasta −N %»: el suelo de coste recorta el descuento en algunos productos, así que el porcentaje
 * es el TECHO de la promoción, no el que llevan todos. Anunciar «−30 %» a secas cuando muchos salen a
 * −17 % sería engañoso.
 */
@Component({
  selector: 'nx-cartel-promociones',
  imports: [RouterLink, ImagenSegura],
  template: `
    @if (promocion(); as promo) {
      <section
        class="relative isolate overflow-hidden rounded-3xl bg-[#14212e] text-[#f4f6f9]
               shadow-[0_10px_40px_-12px_rgba(10,20,30,0.55)] ring-1 ring-white/5
               transition-all duration-700"
        [class.translate-y-0]="visible()"
        [class.opacity-100]="visible()"
        [class.-translate-y-4]="!visible()"
        [class.opacity-0]="!visible()"
        (mouseenter)="pausado.set(true)"
        (mouseleave)="pausado.set(false)"
        [attr.aria-label]="t('promo.banner.aria')"
      >
        <!-- Textura del fondo: dos halos difusos con los colores de marca y un velo diagonal muy tenue.
             Estáticos y sutiles a propósito: dan profundidad sin el degradado chillón de antes. -->
        <span aria-hidden="true" class="pointer-events-none absolute -right-24 -top-28 -z-10 h-72 w-72 rounded-full bg-[#0c4a97]/25 blur-3xl"></span>
        <span aria-hidden="true" class="pointer-events-none absolute -bottom-24 left-1/3 -z-10 h-64 w-64 rounded-full bg-[#c0862d]/15 blur-3xl"></span>
        <span aria-hidden="true" class="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-white/5 via-transparent to-transparent"></span>
        <span aria-hidden="true" class="pointer-events-none absolute inset-0 promo-shine"></span>

        <div class="animate-nx-fade relative flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:gap-8">
          <div class="min-w-0 lg:w-72 lg:shrink-0">
            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d9a441]">
              {{ t('promo.banner.kicker') }}
            </p>
            <!-- «text-white!»: la regla global de los encabezados gana a las utilidades, y sin la
                 marca de importante el título saldría en tinta oscura, ilegible sobre el marino. -->
            <h2 class="mt-1.5 truncate text-2xl font-bold tracking-tight text-white! sm:text-3xl">
              {{ promo.nombre }}
            </h2>
            <div class="mt-3 flex flex-wrap items-center gap-2">
              <span class="rounded-lg bg-[#b4472e] px-2.5 py-1 text-base font-extrabold text-[#fbf0ec] shadow-sm">
                {{ hasta() }}
              </span>
              @if (dias() !== null) {
                <span class="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-medium text-white/85 ring-1 ring-white/15">
                  {{ cuentaAtras() }}
                </span>
              }
            </div>
            <a
              [routerLink]="['/catalog']"
              [queryParams]="{ promotionId: promo.id, promo: promo.nombre }"
              class="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-ink-900 shadow-sm transition hover:bg-white/90"
            >
              {{ t('promo.banner.cta') }}
            </a>
          </div>

          @if (promo.productos.length > 0) {
            <div class="-mx-1 flex min-w-0 flex-1 gap-3 overflow-x-auto px-1 pb-1">
              @for (producto of promo.productos; track producto.id) {
                <a
                  [routerLink]="['/catalog', producto.slug]"
                  class="group w-28 shrink-0 rounded-2xl bg-white p-2 text-ink-900 shadow-sm transition hover:-translate-y-1 hover:shadow-lg sm:w-32"
                >
                  <div class="aspect-square overflow-hidden rounded-xl bg-[#f4f6f9]">
                    <nx-imagen-segura
                      [src]="producto.imagenPrincipal"
                      [alt]="producto.titulo"
                      clase="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  </div>
                  <p class="mt-1.5 line-clamp-2 text-[11px] leading-tight text-[#485563]">
                    {{ producto.titulo }}
                  </p>
                  <div class="mt-0.5 flex items-baseline gap-1.5">
                    <p class="text-sm font-bold text-ink-900">{{ producto.precio.formateado }}</p>
                    @if (producto.precio.anteriorFormateado) {
                      <p class="text-[10px] text-[#8a97a5] line-through">
                        {{ producto.precio.anteriorFormateado }}
                      </p>
                    }
                  </div>
                </a>
              }
            </div>
          }
        </div>

        @if (promociones().length > 1) {
          <div class="relative flex justify-center gap-1.5 pb-3.5">
            @for (otra of promociones(); track otra.id; let i = $index) {
              <button
                type="button"
                (click)="actual.set(i)"
                [attr.aria-label]="otra.nombre"
                [attr.aria-current]="i === actual()"
                class="h-1.5 rounded-full transition-all"
                [class]="i === actual() ? 'w-6 bg-[#d9a441]' : 'w-1.5 bg-white/30 hover:bg-white/60'"
              ></button>
            }
          </div>
        }
      </section>
    }
  `,
})
export class CartelPromociones {
  private readonly puerto = inject(PROMOCIONES_PORT);
  private readonly preferencias = inject(PreferenciasService);
  private readonly traduccion = inject(TraduccionService);

  protected readonly t = this.traduccion.t;
  protected readonly actual = signal(0);
  protected readonly visible = signal(false);
  protected readonly pausado = signal(false);

  private readonly datos = resource({
    params: () => ({ idioma: this.preferencias.idioma() }),
    loader: async () => {
      const resultado = await this.puerto.vivas();
      // Un cartel que no carga no es motivo para romper la portada.
      return resultado.ok ? resultado.valor : [];
    },
  });

  protected readonly promociones = computed(() => this.datos.value() ?? []);
  protected readonly promocion = computed(() => this.promociones()[this.actual()] ?? null);
  protected readonly dias = computed(() => diasQueQuedan(this.promocion()?.terminaEl));

  protected readonly hasta = computed(() =>
    this.traduccion.tCon('promo.banner.upTo', { n: String(this.promocion()?.porcentaje ?? 0) }),
  );

  protected readonly cuentaAtras = computed(() => {
    const dias = this.dias();
    return dias === 1
      ? this.t('promo.banner.lastDay')
      : this.traduccion.tCon('promo.banner.daysLeft', { n: String(dias ?? 0) });
  });

  constructor() {
    const entrada = setTimeout(() => this.visible.set(true), ENTRADA_MS);
    const pase = setInterval(() => {
      const cuantas = this.promociones().length;
      if (cuantas > 1 && !this.pausado()) {
        this.actual.update((i) => (i + 1) % cuantas);
      }
    }, PASE_MS);
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(entrada);
      clearInterval(pase);
    });
  }
}
