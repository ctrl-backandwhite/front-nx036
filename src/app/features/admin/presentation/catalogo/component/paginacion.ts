import { Component, computed, inject, input, model } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';

/**
 * Anterior, siguiente y en qué página se está.
 *
 * <p>PIEZA PROVISIONAL: le corresponde al sistema de diseño —la usan también pedidos, usuarios y
 * carteras— y todavía no existe allí. Se hace aquí la mínima para no bloquear el porte; cuando `@ds`
 * publique la suya, se sustituye.
 *
 * <p>Los botones son de 44 px de lado para que se puedan pulsar con el dedo: el panel también se abre
 * desde el móvil.
 */
@Component({
  selector: 'nx-paginacion',
  imports: [FaIconComponent],
  template: `
    @if (paginas() > 1) {
      <nav class="flex items-center justify-center gap-2 py-2" [attr.aria-label]="t('pagination.page')">
        <button
          type="button"
          class="btn btn-outline btn-sm min-h-11 min-w-11"
          [disabled]="pagina() === 0"
          [attr.aria-label]="t('pagination.previous')"
          (click)="pagina.set(pagina() - 1)"
        >
          <fa-icon [icon]="iconoAtras" />
        </button>
        <span class="text-[12px] text-ink-500">
          {{ t('pagination.page') }} {{ pagina() + 1 }} {{ t('pagination.of') }} {{ paginas() }}
        </span>
        <button
          type="button"
          class="btn btn-outline btn-sm min-h-11 min-w-11"
          [disabled]="esLaUltima()"
          [attr.aria-label]="t('pagination.next')"
          (click)="pagina.set(pagina() + 1)"
        >
          <fa-icon [icon]="iconoAdelante" />
        </button>
      </nav>
    }
  `,
})
export class Paginacion {
  readonly pagina = model.required<number>();
  readonly paginas = input.required<number>();

  protected readonly iconoAtras = faChevronLeft;
  protected readonly iconoAdelante = faChevronRight;
  protected readonly t = inject(TraduccionService).t;

  protected readonly esLaUltima = computed(() => this.pagina() >= this.paginas() - 1);
}
