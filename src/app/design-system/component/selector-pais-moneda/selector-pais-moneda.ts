import { Component, ElementRef, computed, inject, input, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChevronDown, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { REGIONS, Region, findRegion } from '@shared/i18n/regions';
import { PreferenciasService } from '@core/preferences/preferencias';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { EnfocaAlAparecer } from '../../directive/enfoca-al-aparecer.directive';

/**
 * El selector de país: elegir uno fija a la vez la MONEDA de la tienda y el IDIOMA de la interfaz.
 *
 * <p>Estaban separados y era una fuente constante de incoherencias: la página en español y los precios
 * en dólares, porque nadie cambia dos desplegables seguidos. Una región es una decisión sola.
 *
 * <p>El cambio se guarda aquí —son preferencias de presentación, no negocio— y no se anuncia a nadie.
 *
 * <p>POR QUÉ NO SE AVISA. Los precios los calcula el BACKEND, así que cambiar de divisa obliga a volver
 * a pedir los datos. El front anterior lo resuelve recargando la página entera
 * (`window.location.reload()`): tira también lo que no ha cambiado —sesión, cesta, posición del
 * desplazamiento— y cuesta un arranque completo. Aquí el cambio viaja como SEÑAL: se escribe la
 * preferencia y toda lectura que declare depender de `moneda()` o de `idioma()` se vuelve a pedir sola,
 * sin recarga y sin tirar lo que ya estaba en pantalla.
 *
 * <p>Este componente TENÍA una salida `elegida` para que el marco de página avisara a quien tocaba, y era
 * justo el fallo: había que acordarse de atarla en cada sitio donde se monta el selector, ninguno de los
 * tres lo hacía, y los precios se quedaban en la divisa anterior hasta recargar a mano. Una salida que
 * hay que recordar enlazar es un fallo esperando turno; una dependencia declarada en la lectura no se
 * puede olvidar. Se retira, y con ella la forma de equivocarse.
 */
@Component({
  selector: 'nx-selector-pais-moneda',
  imports: [FaIconComponent, EnfocaAlAparecer],
  template: `
    <div class="relative" [class.w-full]="anchoCompleto()">
      <button
        type="button"
        (click)="alterna()"
        [attr.aria-expanded]="abierto()"
        aria-haspopup="listbox"
        class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-ink-200 hover:border-ink-300 text-[13px] transition-colors"
        [class.w-full]="anchoCompleto()"
        [title]="titulo()"
      >
        <span class="text-base leading-none">{{ activa().flag }}</span>
        <!-- A ancho completo (el cajón del móvil) se enseña el país además de la moneda: ahí hay sitio
             y sin el nombre no se entiende qué es este botón. -->
        @if (anchoCompleto()) {
          <span class="text-[12px] text-ink-700 dark:text-ink-200">{{ activa().countryLabel }}</span>
        }
        <!-- La variante «sm:» lleva dos puntos y no cabe en un «[class.x]»: va en una cadena entera. -->
        <span
          [class]="
            'font-mono text-[11px] text-ink-700 dark:text-ink-200 font-medium ' +
            (anchoCompleto() ? 'inline' : 'hidden sm:inline')
          "
        >
          {{ activa().currency }}
        </span>
        <span class="hidden md:inline text-[11px] text-ink-400 dark:text-ink-500">·</span>
        <span class="hidden md:inline font-mono text-[11px] text-ink-700 dark:text-ink-200 font-medium">
          {{ activa().locale.toUpperCase() }}
        </span>
        <fa-icon
          [icon]="iconoAbajo"
          class="text-[9px] text-ink-500 dark:text-ink-400"
          [class.ml-auto]="anchoCompleto()"
        />
      </button>

      @if (abierto()) {
        <div
          role="listbox"
          class="absolute right-0 w-[90vw] max-w-xs bg-white border border-ink-200 rounded-md shadow-md z-50 overflow-hidden"
          [class.bottom-full]="haciaArriba()"
          [class.mb-1]="haciaArriba()"
          [class.top-full]="!haciaArriba()"
          [class.mt-1]="!haciaArriba()"
        >
          <div class="px-2 py-2 border-b border-ink-100">
            <div class="flex items-center gap-1.5 bg-ink-50 rounded px-2 py-1">
              <fa-icon [icon]="iconoBuscar" class="text-[10px] text-ink-400" />
              <input
                nxEnfocaAlAparecer
                [value]="consulta()"
                (input)="busca($event)"
                [placeholder]="t('picker.search')"
                [attr.aria-label]="t('picker.search')"
                class="bg-transparent outline-none text-[12px] flex-1"
              />
            </div>
          </div>
          <!-- Un único contenedor con desplazamiento: dos anidados hacen imposible llegar al final. -->
          <div class="max-h-[60vh] overflow-y-auto py-1">
            <div class="px-3 py-1 text-[10px] uppercase tracking-wide text-ink-400">
              {{ t('picker.country_currency') }}
            </div>
            @if (filtradas().length === 0) {
              <div class="px-3 py-4 text-center text-[11px] text-ink-400">
                {{ t('picker.no_results') }}
              </div>
            }
            @for (region of filtradas(); track region.countryCode + region.locale) {
              <button
                type="button"
                (click)="elige(region)"
                class="w-full px-3 py-1.5 text-left text-[12px] flex items-center gap-2 hover:bg-ink-50"
                [class.bg-brand-50]="esActiva(region)"
                [class.text-brand-700]="esActiva(region)"
                [class.text-ink-700]="!esActiva(region)"
              >
                <span class="text-base leading-none">{{ region.flag }}</span>
                <span class="flex-1 truncate">{{ region.countryLabel }}</span>
                <span class="font-mono text-[11px] text-ink-700 dark:text-ink-200 font-medium">
                  {{ region.currency }}
                </span>
                <span class="font-mono text-[11px] text-ink-600 dark:text-ink-300 font-medium">
                  {{ region.locale.toUpperCase() }}
                </span>
              </button>
            }
          </div>
        </div>
      }
    </div>
  `,
  host: { '(document:mousedown)': 'cierraSiEsFuera($event)' },
})
export class SelectorPaisMoneda {
  /** Hacia dónde abre el panel. Arriba para el cajón del móvil, donde el botón está abajo del todo. */
  readonly haciaArriba = input(false);
  /** El botón ocupa todo el ancho. Útil en el cajón del móvil. */
  readonly anchoCompleto = input(false);

  protected readonly iconoAbajo = faChevronDown;
  protected readonly iconoBuscar = faMagnifyingGlass;
  protected readonly t = inject(TraduccionService).t;

  private readonly preferencias = inject(PreferenciasService);
  private readonly anfitrion = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly abierto = signal(false);
  protected readonly consulta = signal('');

  protected readonly activa = computed(
    () => findRegion(this.preferencias.moneda(), this.preferencias.idioma()) ?? REGIONS[0],
  );

  protected readonly titulo = computed(() => {
    const region = this.activa();
    return `${region.countryLabel} · ${region.currency} · ${region.locale.toUpperCase()}`;
  });

  protected readonly filtradas = computed(() => {
    const texto = this.consulta().toLowerCase();
    if (!texto) {
      return REGIONS;
    }
    return REGIONS.filter(
      (r) =>
        r.countryLabel.toLowerCase().includes(texto) ||
        r.currency.toLowerCase().includes(texto) ||
        r.locale.toLowerCase().includes(texto),
    );
  });

  protected esActiva(region: Region): boolean {
    const actual = this.activa();
    return (
      region.countryCode === actual.countryCode &&
      region.currency === actual.currency &&
      region.locale === actual.locale
    );
  }

  protected alterna(): void {
    this.abierto.update((v) => !v);
  }

  protected busca(evento: Event): void {
    this.consulta.set((evento.target as HTMLInputElement).value);
  }

  protected cierraSiEsFuera(evento: Event): void {
    if (this.abierto() && !this.anfitrion.nativeElement.contains(evento.target as Node)) {
      this.abierto.set(false);
    }
  }

  protected elige(region: Region): void {
    this.preferencias.cambiaIdioma(region.locale);
    this.preferencias.cambiaMoneda(region.currency);
    this.abierto.set(false);
    this.consulta.set('');
  }
}
