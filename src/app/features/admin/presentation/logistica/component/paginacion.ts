import { Component, computed, inject, input, model } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';

/**
 * El paso de página de un listado.
 *
 * <p>PIEZA IMPROVISADA: en el front de React es una función exportada por la pantalla de pedidos y la
 * copian varias más, así que su sitio es el sistema de diseño. Se hace aquí una versión mínima para no
 * bloquear al equipo que lo está montando; cuando exista `@ds`, esta se retira.
 *
 * <p>La página se cuenta desde CERO hacia dentro —es lo que espera el backend— y se enseña desde uno,
 * que es como la cuenta quien mira. La conversión vive aquí y en ningún otro sitio.
 */
@Component({
  selector: 'nx-paginacion',
  template: `
    <div class="flex items-center justify-end gap-3 text-[12px]">
      <span class="opacity-70">
        {{ t('pagination.page') }} <strong>{{ pagina() + 1 }}</strong> {{ t('pagination.of') }}
        {{ ultima() + 1 }}
      </span>
      <div class="join">
        <button
          type="button"
          class="btn btn-sm join-item"
          [disabled]="enLaPrimera()"
          (click)="ve(0)"
          [attr.aria-label]="t('pagination.page') + ' 1'"
        >
          «
        </button>
        <button
          type="button"
          class="btn btn-sm join-item"
          [disabled]="enLaPrimera()"
          (click)="ve(pagina() - 1)"
        >
          {{ t('pagination.previous') }}
        </button>
        <button
          type="button"
          class="btn btn-sm join-item"
          [disabled]="enLaUltima()"
          (click)="ve(pagina() + 1)"
        >
          {{ t('pagination.next') }}
        </button>
        <button
          type="button"
          class="btn btn-sm join-item"
          [disabled]="enLaUltima()"
          (click)="ve(ultima())"
          [attr.aria-label]="t('pagination.page') + ' ' + (ultima() + 1)"
        >
          »
        </button>
      </div>
    </div>
  `,
})
export class Paginacion {
  /** Página actual, contada desde cero. */
  readonly pagina = model.required<number>();
  /** Cuántas páginas hay. Siempre al menos una: una tabla vacía sigue siendo la página 1 de 1. */
  readonly paginas = input(1);

  protected readonly t = inject(TraduccionService).t;

  protected readonly ultima = computed(() => Math.max(1, this.paginas()) - 1);
  protected readonly enLaPrimera = computed(() => this.pagina() <= 0);
  protected readonly enLaUltima = computed(() => this.pagina() >= this.ultima());

  protected ve(destino: number): void {
    // Se recorta aquí y no en cada quien llama: pedir una página que no existe devuelve una lista vacía
    // que se lee como «no hay resultados», y eso manda a revisar los filtros por nada.
    this.pagina.set(Math.min(this.ultima(), Math.max(0, destino)));
  }
}
