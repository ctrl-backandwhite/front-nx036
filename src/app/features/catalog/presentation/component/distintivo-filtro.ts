import { Component, inject, input, output } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';

/**
 * El distintivo de un filtro puesto, con su aspa para quitarlo.
 *
 * <p>Existe porque los filtros del catálogo se pueden poner desde fuera —desde el cartel de rebajas,
 * desde una tarjeta— y sin verlos escritos no había forma de saber por qué la lista salía recortada.
 */
@Component({
  selector: 'nx-distintivo-filtro',
  template: `
    <span class="chip chip-active inline-flex items-center gap-1.5">
      <span class="truncate max-w-[180px]">{{ etiqueta() }}</span>
      <button
        type="button"
        (click)="quita.emit()"
        [attr.aria-label]="etiquetaDeQuitar() || t('catalog.clear')"
        class="hover:text-red-700 text-[10px] min-w-11 sm:min-w-0 text-center"
      >
        ✕
      </button>
    </span>
  `,
})
export class DistintivoFiltro {
  readonly etiqueta = input.required<string>();
  readonly etiquetaDeQuitar = input('');
  readonly quita = output<void>();

  protected readonly t = inject(TraduccionService).t;
}
