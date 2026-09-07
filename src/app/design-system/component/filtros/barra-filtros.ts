import { Component, inject, input, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faChevronDown,
  faChevronUp,
  faFilter,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';

/**
 * La barra que agrupa los filtros de un listado.
 *
 * <p>En el MÓVIL arrancan plegados; en el escritorio, siempre a la vista. Desplegados ocupaban media
 * pantalla —seis selectores apilados más el buscador— y el primer producto quedaba fuera. Quien entra
 * al catálogo va a mirar productos, no a filtrar; y quien sí quiere filtrar lo busca a propósito. Es el
 * patrón de cualquier tienda en el móvil: un botón que abre, con el número de filtros puestos encima
 * para que nunca se filtre sin saberlo.
 *
 * <p>En el escritorio no se pliega nada: ahí caben en una fila y esconderlos solo añadiría un clic.
 */
@Component({
  selector: 'nx-barra-filtros',
  imports: [FaIconComponent],
  template: `
    <div class="card p-3">
      <div class="flex flex-wrap items-center gap-2">
        <!-- En móvil el rótulo es el BOTÓN que despliega; en escritorio es solo una etiqueta.

             Y en móvil se le da altura de dedo. Medía 16,5 píxeles de alto —muy por debajo del mínimo
             de 24 que se ha fijado el proyecto— y a esa anchura es la ÚNICA puerta a los filtros del
             catálogo del panel: si no se acierta, no hay forma de filtrar. La barra del escaparate ya
             llevaba esta misma altura mínima y esta se quedó sin ella. En escritorio se anula, porque ahí no
             es un botón sino una etiqueta. -->
        <button
          type="button"
          (click)="alterna()"
          [attr.aria-expanded]="abierto()"
          class="md:pointer-events-none inline-flex items-center gap-1.5 min-h-11 md:min-h-0 text-[11px]
                 text-ink-500 uppercase tracking-wider font-medium pr-2 md:border-r md:border-ink-100"
        >
          <fa-icon [icon]="iconoFiltro" class="text-[10px]" />
          {{ t('filters.label') }}
          @if (activos() > 0) {
            <span
              class="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-brand-600 text-white text-[10px] font-medium"
            >
              {{ activos() }}
            </span>
          }
          <fa-icon
            [icon]="abierto() ? iconoArriba : iconoAbajo"
            class="md:hidden text-[9px] ml-0.5"
          />
        </button>
        <div
          class="md:flex w-full md:w-auto flex-wrap items-center gap-2"
          [class.flex]="abierto()"
          [class.hidden]="!abierto()"
        >
          <ng-content />
          @if (hayActivos()) {
            <button
              type="button"
              (click)="limpia.emit()"
              class="md:ml-auto inline-flex items-center gap-1 text-[12px] text-ink-500 hover:text-red-600"
            >
              <fa-icon [icon]="iconoAspa" class="text-[10px]" /> {{ t('filters.clear') }}
            </button>
          }
        </div>
      </div>
    </div>
  `,
})
export class BarraFiltros {
  /** Cuántos filtros hay puestos. Es lo que se pinta en la insignia del botón del móvil. */
  readonly activos = input(0);
  /** Cierto si hay algo que limpiar: controla si se ofrece el enlace de «quitar filtros». */
  readonly hayActivos = input(false);

  /** Quitar todos los filtros. Solo se ofrece si quien monta la barra sabe hacerlo. */
  readonly limpia = output<void>();

  protected readonly iconoFiltro = faFilter;
  protected readonly iconoAspa = faXmark;
  protected readonly iconoAbajo = faChevronDown;
  protected readonly iconoArriba = faChevronUp;
  protected readonly t = inject(TraduccionService).t;
  protected readonly abierto = signal(false);

  protected alterna(): void {
    this.abierto.update((v) => !v);
  }
}
