import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faCheck, faChevronDown, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { EnfocaAlAparecer } from '../../directive/enfoca-al-aparecer.directive';

export interface OpcionDeFiltro {
  readonly valor: string;
  readonly etiqueta: string;
  /** Cuántos resultados hay tras la opción. Solo se pinta si viene. */
  readonly cuantos?: number;
}

/** A partir de esta cantidad de opciones el panel trae su propio buscador. */
const OPCIONES_PARA_BUSCAR = 8;

/** Teclas que mueven el foco dentro del panel. Cualquier otra se deja pasar tal cual. */
const TECLAS_DE_NAVEGACION = ['ArrowDown', 'ArrowUp', 'Home', 'End'];

/**
 * Un filtro de una sola opción, con forma de pastilla.
 *
 * <p>NO es un `<select>` nativo, y eso es deliberado: el original enseña el recuento de cada opción,
 * la marca de comprobado sobre la elegida y un buscador cuando las opciones se cuentan por decenas.
 * Nada de eso cabe dentro de la rueda del sistema, así que el panel es propio. A cambio hay que
 * reponer a mano lo que el nativo daba gratis —cerrar al pulsar fuera, cerrar con Escape, recorrer con
 * las flechas y los papeles `listbox`/`option`—, que es justo lo que hace este componente.
 *
 * <p>El marcado y las clases son los del otro front: es el mismo diseño en dos tecnologías, y cualquier
 * desvío se ve al instante al poner los dos catálogos uno al lado del otro.
 *
 * <p>Vive en el sistema de diseño porque durante un tiempo hubo DOS: esta, que solo usaba el catálogo
 * del escaparate, y otra casi idéntica aquí que usaban el panel y los pedidos. La copia del sistema de
 * diseño se había quedado atrás en lo que menos se ve y más importa: sin papeles `option` ni
 * `aria-selected`, sin recorrer las opciones con las flechas, sin abrir con la flecha abajo y con los
 * blancos de ratón —quien filtra desde el móvil tenía que acertar en 24 píxeles—. Se quedó la buena y
 * la otra se borró, así que las diez pantallas que montaban aquella heredan las cuatro cosas.
 */
@Component({
  selector: 'nx-filtro-desplegable',
  imports: [FaIconComponent, FormField, EnfocaAlAparecer],
  template: `
    <div class="relative">
      <button
        type="button"
        (click)="alterna()"
        (keydown.arrowdown)="abreConElTeclado($event)"
        [attr.aria-expanded]="abierto()"
        aria-haspopup="listbox"
        [attr.aria-label]="etiqueta()"
        [class]="
          'group inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 min-h-11 sm:min-h-8 text-[12px] transition-colors focus-ring ' +
          clasesDelChip()
        "
      >
        @if (icono(); as adorno) {
          <fa-icon [icon]="adorno" class="text-[10px] text-ink-400 group-hover:text-ink-600" />
        }
        <span class="text-ink-500">{{ etiqueta() }}:</span>
        <span class="font-medium truncate max-w-[140px]">
          {{ elegida()?.etiqueta ?? (marcador() || t('filters.all')) }}
        </span>
        <fa-icon
          [icon]="iconoAbajo"
          class="text-[9px] text-ink-400 transition-transform"
          [class.rotate-180]="abierto()"
        />
      </button>

      @if (abierto()) {
        <!-- El papel de lista de opciones va aquí y no en la lista para que el buscador quede DENTRO
             del mismo control: con lector de pantalla se oye un solo desplegable, no dos regiones. -->
        <div
          role="listbox"
          [attr.aria-label]="etiqueta()"
          (keydown)="navega($event)"
          tabindex="-1"
          class="absolute left-0 top-full mt-1 min-w-[14rem] max-w-[20rem] bg-white border border-ink-200 rounded-lg shadow-lg z-30 overflow-hidden"
        >
          @if (conBuscador()) {
            <div class="p-2 border-b border-ink-100 relative">
              <fa-icon
                [icon]="iconoBuscar"
                class="absolute left-4 top-1/2 -translate-y-1/2 text-[11px] text-ink-400"
              />
              <input
                type="text"
                [formField]="buscador"
                [placeholder]="t('filters.search')"
                [attr.aria-label]="t('filters.search')"
                nxEnfocaAlAparecer
                class="w-full pl-7 pr-2 py-1.5 min-h-11 sm:min-h-0 text-[12px] border border-ink-200 rounded-md focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>
          }
          <!-- role="none" en la lista y en cada elemento: entre una lista de opciones y sus opciones
               no puede haber un papel de lista, o el árbol de accesibilidad deja de ser válido. -->
          <ul role="none" class="max-h-64 overflow-y-auto scrollbar-thin py-1">
            <li role="none">
              <button
                type="button"
                role="option"
                [attr.aria-selected]="valor() === null"
                (click)="elige(null)"
                class="w-full flex items-center justify-between px-3 py-1.5 min-h-11 sm:min-h-0 text-[12px] text-left hover:bg-ink-50"
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
              <li role="none" class="px-3 py-3 text-[12px] text-ink-400 text-center">
                {{ t('filters.no_results') }}
              </li>
            }
            @for (opcion of filtradas(); track opcion.valor) {
              <li role="none">
                <button
                  type="button"
                  role="option"
                  [attr.aria-selected]="opcion.valor === valor()"
                  (click)="elige(opcion.valor)"
                  class="w-full flex items-center justify-between gap-2 px-3 py-1.5 min-h-11 sm:min-h-0 text-[12px] text-left hover:bg-ink-50"
                  [class.text-brand-700]="opcion.valor === valor()"
                  [class.font-medium]="opcion.valor === valor()"
                  [class.text-ink-700]="opcion.valor !== valor()"
                >
                  <span class="truncate">{{ opcion.etiqueta }}</span>
                  <span class="flex items-center gap-2 shrink-0">
                    @if (opcion.cuantos !== undefined) {
                      <span
                        class="text-[10px]"
                        [class.text-brand-600]="opcion.valor === valor()"
                        [class.text-ink-400]="opcion.valor !== valor()"
                      >
                        {{ opcion.cuantos }}
                      </span>
                    }
                    @if (opcion.valor === valor()) {
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
export class FiltroDesplegable {
  readonly etiqueta = input.required<string>();
  readonly opciones = input.required<readonly OpcionDeFiltro[]>();
  readonly marcador = input('');
  /** Fuerza el buscador del panel. Sin decir nada, aparece cuando hay muchas opciones. */
  readonly buscable = input<boolean | undefined>(undefined);
  readonly icono = input<IconDefinition | undefined>(undefined);
  /** Sin filtro puesto es `null`, no cadena vacía: así el padre distingue «todos» de «vacío». */
  readonly valor = model<string | null>(null);

  protected readonly iconoAbajo = faChevronDown;
  protected readonly iconoMarca = faCheck;
  protected readonly iconoBuscar = faMagnifyingGlass;
  protected readonly t = inject(TraduccionService).t;

  protected readonly abierto = signal(false);

  private readonly anfitrion = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly inyector = inject(Injector);

  /**
   * Lo tecleado en el buscador del panel. Aunque sea un solo campo pasa por el formulario igual que el
   * resto: es lo que da el enlace con la directiva, y con él el estado de tocado y sucio que si no
   * habría que inventarse aquí dentro.
   */
  private readonly consulta = signal('');
  protected readonly buscador = form(this.consulta);

  /**
   * Las clases del chip van en UNA cadena y no en asociaciones sueltas: las variantes con `hover:`
   * llevan dos puntos, y `[class.hover:border-ink-300]` no es un nombre de clase que Angular sepa leer.
   */
  protected readonly clasesDelChip = computed(() =>
    this.elegida()
      ? 'border-brand-300 bg-brand-50 text-brand-800'
      : 'border-ink-200 bg-white text-ink-700 hover:border-ink-300',
  );

  protected readonly elegida = computed(() => {
    const actual = this.valor();
    return actual ? (this.opciones().find((o) => o.valor === actual) ?? null) : null;
  });

  protected readonly conBuscador = computed(
    () => this.buscable() ?? this.opciones().length > OPCIONES_PARA_BUSCAR,
  );

  protected readonly filtradas = computed<readonly OpcionDeFiltro[]>(() => {
    const texto = this.consulta().trim().toLowerCase();
    return texto
      ? this.opciones().filter((o) => o.etiqueta.toLowerCase().includes(texto))
      : this.opciones();
  });

  protected alterna(): void {
    if (this.abierto()) {
      this.cierra();
    } else {
      this.abre();
    }
  }

  /**
   * La flecha abajo abre el panel y deja el foco dentro, que es lo que hace un desplegable nativo.
   * Sin esto, quien navega con teclado abría el panel y seguía fuera de él.
   */
  protected abreConElTeclado(evento: Event): void {
    evento.preventDefault();
    this.abre();
    // Con buscador el foco ya se lo lleva el campo: dos candidatos pelearían por él en el mismo ciclo.
    if (!this.conBuscador()) {
      afterNextRender(() => this.opcionesDelPanel()[0]?.focus(), { injector: this.inyector });
    }
  }

  protected cierra(): void {
    this.abierto.set(false);
  }

  protected cierraSiEsFuera(evento: Event): void {
    if (this.abierto() && !this.anfitrion.nativeElement.contains(evento.target as Node)) {
      this.cierra();
    }
  }

  protected elige(valor: string | null): void {
    this.valor.set(valor);
    this.cierra();
  }

  /**
   * Flechas, Inicio y Fin recorren las opciones. Se consulta el documento en vez de guardar una lista
   * de referencias porque las opciones aparecen y desaparecen al teclear en el buscador: lo que hay
   * pintado en este instante es la única lista fiable.
   */
  protected navega(evento: KeyboardEvent): void {
    if (!TECLAS_DE_NAVEGACION.includes(evento.key)) {
      return;
    }
    const opciones = this.opcionesDelPanel();
    if (opciones.length === 0) {
      return;
    }
    evento.preventDefault();
    const actual = opciones.indexOf(evento.target as HTMLElement);
    opciones[this.destino(evento.key, actual, opciones.length)].focus();
  }

  private destino(tecla: string, actual: number, cuantas: number): number {
    switch (tecla) {
      case 'Home':
        return 0;
      case 'End':
        return cuantas - 1;
      case 'ArrowDown':
        return Math.min(actual + 1, cuantas - 1);
      default:
        return Math.max(actual - 1, 0);
    }
  }

  private abre(): void {
    // El buscador se vacía al abrir: la consulta de la vez anterior escondía opciones sin explicar por qué.
    this.consulta.set('');
    this.abierto.set(true);
  }

  private opcionesDelPanel(): HTMLElement[] {
    return [...this.anfitrion.nativeElement.querySelectorAll<HTMLElement>('[role="option"]')];
  }
}
