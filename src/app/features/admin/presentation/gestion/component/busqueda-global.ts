import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  IconDefinition, faBoxesStacked, faKey, faMagnifyingGlass, faTruck, faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import {
  MAPA_DEL_PANEL, agrupaPorSeccion, filtraElMapa,
} from '../../../domain/gestion/model/navegacion';

/** El dibujo de cada familia de icono. La familia la decide el mapa; el dibujo, la pantalla. */
const ICONOS: Readonly<Record<string, IconDefinition>> = {
  catalogo: faBoxesStacked,
  ventas: faTruck,
  llave: faKey,
  personas: faUsers,
};

/**
 * La búsqueda rápida del panel: Ctrl/⌘+K abre, se teclea y se salta a la pantalla.
 *
 * <p>Busca entre las PANTALLAS del panel, no entre los datos: quien busca un producto concreto entra al
 * catálogo y busca allí. Así no hace falta ningún endpoint y responde mientras se escribe.
 *
 * <p>La ventana arranca ARRIBA y no centrada, con altura máxima relativa a la pantalla: centrada y
 * recortada, los últimos resultados quedaban fuera y no había forma de llegar a ellos.
 *
 * <p>MOBILE FIRST: el disparador con teclas solo se enseña desde `md` —en el móvil no hay teclado
 * físico—, pero la ventana funciona igual en cualquier ancho.
 */
@Component({
  selector: 'nx-busqueda-global',
  imports: [RouterLink, FaIconComponent],
  template: `
    <button type="button" class="btn btn-ghost btn-sm gap-2 hidden md:inline-flex"
            [title]="t('admin.search.placeholder')" (click)="abre()">
      <fa-icon [icon]="iconoBuscar" class="text-[12px] opacity-70" />
      <span class="opacity-60 text-[12px]">{{ t('admin.search.placeholder') }}</span>
      <kbd class="kbd kbd-xs">⌘K</kbd>
    </button>

    @if (abierto()) {
      <div class="modal modal-open items-start">
        <!-- El fondo es un BOTÓN de verdad: así cerrar pulsando fuera funciona también con el teclado,
             y el contenido deja de necesitar parar la propagación del clic. -->
        <button type="button" class="absolute inset-0 cursor-default"
                [attr.aria-label]="t('common.close')" (click)="cierra()"></button>
        <div class="modal-box relative max-w-2xl p-0 overflow-hidden mt-[10vh] max-h-[75vh] flex flex-col"
             role="dialog" aria-modal="true" [attr.aria-label]="t('admin.search.placeholder')">
          <div class="border-b border-base-300 p-3 flex items-center gap-2 shrink-0">
            <fa-icon [icon]="iconoBuscar" class="opacity-60" />
            <input #campo type="search" [value]="consulta()" (input)="escribe($event)"
                   [placeholder]="t('admin.search.placeholder')"
                   [attr.aria-label]="t('admin.search.placeholder')"
                   class="grow bg-transparent focus:outline-none text-sm" />
            <kbd class="kbd kbd-xs">Esc</kbd>
          </div>
          <div class="flex-1 overflow-y-auto scrollbar-thin">
            @for (grupo of grupos(); track grupo.seccion) {
              <div class="py-2">
                <div class="px-3 text-[10px] uppercase tracking-wider opacity-60">
                  {{ t(grupo.seccion) }}
                </div>
                @for (entrada of grupo.entradas; track entrada.destino) {
                  <a [routerLink]="entrada.destino" (click)="cierra()"
                     class="flex items-center gap-2 px-3 py-2 text-[13px] hover:bg-primary/10">
                    <fa-icon [icon]="icono(entrada.icono)" class="w-4 text-center opacity-60" />
                    <span>{{ t(entrada.etiqueta) }}</span>
                    <code class="ml-auto text-[10px] opacity-50">{{ entrada.destino }}</code>
                  </a>
                }
              </div>
            }
            @if (resultados().length === 0) {
              <div class="text-center opacity-60 text-sm p-6">{{ t('filters.no_results') }}</div>
            }
          </div>
        </div>
      </div>
    }
  `,
  host: {
    // El atajo se escucha en el DOCUMENTO: tiene que funcionar esté donde esté el foco, que es justo
    // la gracia de una paleta de comandos.
    '(document:keydown.control.k)': 'alterna($event)',
    '(document:keydown.meta.k)': 'alterna($event)',
    '(document:keydown.escape)': 'cierra()',
  },
})
export class BusquedaGlobal {
  private readonly traduccion = inject(TraduccionService);
  protected readonly t = this.traduccion.t;

  protected readonly iconoBuscar = faMagnifyingGlass;
  protected readonly abierto = signal(false);
  protected readonly consulta = signal('');

  private readonly campo = viewChild<ElementRef<HTMLInputElement>>('campo');

  protected readonly resultados = computed(() =>
    filtraElMapa(MAPA_DEL_PANEL, this.consulta(), this.traduccion.t),
  );
  protected readonly grupos = computed(() => agrupaPorSeccion(this.resultados()));

  constructor() {
    // El foco se pone cuando el campo YA existe. Hacerlo al pulsar la tecla no funciona: en ese momento
    // el `@if` todavía no ha creado el elemento.
    effect(() => {
      this.campo()?.nativeElement.focus();
    });
  }

  protected icono(familia: string): IconDefinition {
    return ICONOS[familia] ?? faKey;
  }

  protected abre(): void {
    this.consulta.set('');
    this.abierto.set(true);
  }

  protected cierra(): void {
    this.abierto.set(false);
  }

  protected alterna(evento: Event): void {
    // Sin esto el navegador se queda con la combinación (en algunos, «buscar en la página»).
    evento.preventDefault();
    this.abierto.update((v) => !v);
    if (this.abierto()) {
      this.consulta.set('');
    }
  }

  protected escribe(evento: Event): void {
    this.consulta.set((evento.target as HTMLInputElement).value);
  }
}
