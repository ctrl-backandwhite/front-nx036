import { Component, ElementRef, computed, inject, input, model, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  IconDefinition,
  faCheck,
  faChevronDown,
  faMagnifyingGlass,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { EnfocaAlAparecer } from '../../directive/enfoca-al-aparecer.directive';

export interface OpcionFiltro {
  readonly value: string;
  readonly label: string;
  readonly count?: number;
}

/** A partir de esta cantidad de opciones, el desplegable trae su propio buscador. */
const OPCIONES_PARA_BUSCAR = 8;

/**
 * El filtro de una sola opción, con forma de pastilla.
 *
 * <p>Se abre en un panel desplazable con marca de comprobado. No es un `select` nativo porque hay que
 * enseñar el recuento de cada opción y buscar entre ellas cuando son muchas.
 */
@Component({
  selector: 'nx-filtro-seleccion',
  imports: [FaIconComponent, EnfocaAlAparecer],
  template: `
    <div class="relative">
      <button
        type="button"
        (click)="alterna()"
        [attr.aria-expanded]="abierto()"
        aria-haspopup="listbox"
        [class]="
          'group inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] transition-colors focus-ring ' +
          clasesDisparador()
        "
      >
        @if (icono(); as adorno) {
          <fa-icon [icon]="adorno" class="text-[10px] text-ink-400 group-hover:text-ink-600" />
        }
        <span class="text-ink-500">{{ etiqueta() }}:</span>
        <span class="font-medium truncate max-w-[140px]">
          {{ elegida()?.label ?? (marcador() || t('filters.all')) }}
        </span>
        <fa-icon
          [icon]="iconoAbajo"
          class="text-[9px] text-ink-400 transition-transform"
          [class.rotate-180]="abierto()"
        />
      </button>

      @if (abierto()) {
        <div
          role="listbox"
          class="absolute left-0 top-full mt-1 min-w-[14rem] max-w-[20rem] bg-white border border-ink-200 rounded-lg shadow-lg z-30 overflow-hidden"
        >
          @if (conBuscador()) {
            <div class="p-2 border-b border-ink-100 relative">
              <fa-icon
                [icon]="iconoBuscar"
                class="absolute left-4 top-1/2 -translate-y-1/2 text-[11px] text-ink-400"
              />
              <input
                [value]="consulta()"
                (input)="busca($event)"
                [placeholder]="t('filters.search')"
                [attr.aria-label]="t('filters.search')"
                nxEnfocaAlAparecer
                class="w-full pl-7 pr-2 py-1.5 text-[12px] border border-ink-200 rounded-md focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>
          }
          <ul class="max-h-64 overflow-y-auto scrollbar-thin py-1">
            <li>
              <button
                type="button"
                (click)="elige(null)"
                class="w-full flex items-center justify-between px-3 py-1.5 text-[12px] text-left hover:bg-ink-50"
                [class.text-brand-700]="valor() === null"
                [class.font-medium]="valor() === null"
                [class.text-ink-600]="valor() !== null"
              >
                <span>{{ marcador() || t('filters.all') }}</span>
                @if (valor() === null) {
                  <fa-icon [icon]="iconoMarca" class="text-[10px]" />
                }
              </button>
            </li>
            @if (filtradas().length === 0) {
              <li class="px-3 py-3 text-[12px] text-ink-400 text-center">
                {{ t('filters.no_results') }}
              </li>
            }
            @for (opcion of filtradas(); track opcion.value) {
              <li>
                <button
                  type="button"
                  (click)="elige(opcion.value)"
                  class="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-[12px] text-left hover:bg-ink-50"
                  [class.text-brand-700]="opcion.value === valor()"
                  [class.font-medium]="opcion.value === valor()"
                  [class.text-ink-700]="opcion.value !== valor()"
                >
                  <span class="truncate">{{ opcion.label }}</span>
                  <span class="flex items-center gap-2 shrink-0">
                    @if (opcion.count !== undefined) {
                      <span
                        class="text-[10px]"
                        [class.text-brand-600]="opcion.value === valor()"
                        [class.text-ink-400]="opcion.value !== valor()"
                      >
                        {{ opcion.count }}
                      </span>
                    }
                    @if (opcion.value === valor()) {
                      <fa-icon [icon]="iconoMarca" class="text-[10px]" />
                    }
                  </span>
                </button>
              </li>
            }
          </ul>
        </div>
      }
    </div>
  `,
  host: {
    '(document:keydown.escape)': 'cierra()',
    // Pulsar fuera cierra el panel. Va en el documento y no en el propio panel porque el clic que hay
    // que detectar ocurre justo donde el panel NO está.
    '(document:mousedown)': 'cierraSiEsFuera($event)',
  },
})
export class FiltroSeleccion {
  readonly etiqueta = input.required<string>();
  readonly valor = model<string | null>(null);
  readonly opciones = input<readonly OpcionFiltro[]>([]);
  readonly marcador = input('');
  /** Fuerza el buscador dentro del panel. Sin decir nada, aparece cuando hay muchas opciones. */
  readonly buscable = input<boolean | undefined>(undefined);
  readonly icono = input<IconDefinition | undefined>(undefined);

  protected readonly iconoAbajo = faChevronDown;
  protected readonly iconoMarca = faCheck;
  protected readonly iconoBuscar = faMagnifyingGlass;
  protected readonly t = inject(TraduccionService).t;

  protected readonly abierto = signal(false);
  protected readonly consulta = signal('');

  private readonly anfitrion = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Las clases del disparador van en UNA cadena y no en asociaciones sueltas: las variantes con `hover:`
   * llevan dos puntos, y `[class.hover:border-ink-300]` no es un nombre de clase que Angular sepa leer.
   */
  protected readonly clasesDisparador = computed(() =>
    this.elegida()
      ? 'border-brand-300 bg-brand-50 text-brand-800'
      : 'border-ink-200 bg-white text-ink-700 hover:border-ink-300',
  );

  protected readonly elegida = computed(() => {
    const actual = this.valor();
    return actual ? (this.opciones().find((o) => o.value === actual) ?? null) : null;
  });

  protected readonly conBuscador = computed(
    () => this.buscable() ?? this.opciones().length > OPCIONES_PARA_BUSCAR,
  );

  protected readonly filtradas = computed(() => {
    const texto = this.consulta().trim().toLowerCase();
    if (!texto) {
      return this.opciones();
    }
    return this.opciones().filter((o) => o.label.toLowerCase().includes(texto));
  });

  protected alterna(): void {
    this.abierto.update((v) => !v);
  }

  protected cierra(): void {
    this.abierto.set(false);
  }

  protected cierraSiEsFuera(evento: Event): void {
    if (this.abierto() && !this.anfitrion.nativeElement.contains(evento.target as Node)) {
      this.cierra();
    }
  }

  protected busca(evento: Event): void {
    this.consulta.set((evento.target as HTMLInputElement).value);
  }

  protected elige(valor: string | null): void {
    this.valor.set(valor);
    this.cierra();
  }
}
