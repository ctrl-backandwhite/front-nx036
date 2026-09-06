import { Component, inject, output } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';

/**
 * La pastilla de un filtro puesto, con su aspa para quitarlo.
 *
 * <p>Entra con un fundido corto (`animate-scale-in` de la hoja central) para que se vea de dónde sale:
 * un filtro que aparece de golpe en la fila parece que estuviera desde antes.
 */
@Component({
  selector: 'nx-chip-filtro',
  template: `
    <ng-content />
    <button
      type="button"
      (click)="quita.emit()"
      class="opacity-70 hover:opacity-100"
      [attr.aria-label]="t('filters.clear')"
    >
      ×
    </button>
  `,
  host: { class: 'badge badge-primary badge-outline gap-1 cursor-default animate-scale-in' },
})
export class ChipFiltro {
  readonly quita = output<void>();
  protected readonly t = inject(TraduccionService).t;
}
