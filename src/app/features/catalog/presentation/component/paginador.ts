import { Component, inject, input, model } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';

/**
 * Anterior / siguiente. Nada más.
 *
 * <p>El catálogo grande usa desplazamiento infinito; favoritos e historial son listas cortas y ahí una
 * paginación explícita se entiende mejor —se sabe cuánto queda— y no obliga a bajar sin fin.
 */
@Component({
  selector: 'nx-paginador',
  template: `
    @if (totalDePaginas() > 1) {
      <nav class="flex items-center justify-center gap-2" [attr.aria-label]="t('pagination.showing')">
        <button
          type="button"
          class="btn btn-outline btn-sm"
          [disabled]="pagina() === 0"
          (click)="pagina.set(pagina() - 1)"
        >
          {{ t('common.prev') }}
        </button>
        <span class="text-sm text-ink-500">{{ pagina() + 1 }} / {{ totalDePaginas() }}</span>
        <button
          type="button"
          class="btn btn-outline btn-sm"
          [disabled]="pagina() + 1 >= totalDePaginas()"
          (click)="pagina.set(pagina() + 1)"
        >
          {{ t('common.next') }}
        </button>
      </nav>
    }
  `,
})
export class Paginador {
  readonly pagina = model.required<number>();
  readonly totalDePaginas = input.required<number>();

  protected readonly t = inject(TraduccionService).t;
}
