import { Component, inject, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChevronLeft, faChevronRight, faXmark } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';

/**
 * La foto a pantalla completa, con paso a la anterior y a la siguiente.
 *
 * <p>PIEZA PROVISIONAL. El sistema de diseño ya tiene una lupa (`nx-lupa-imagen`), pero abre UNA foto
 * suelta: no recorre una galería. Aquí hace falta lo segundo —quien amplía una foto de producto quiere
 * ver las demás sin cerrar y volver a abrir—, así que se deja esta versión mínima y se anota para
 * fundirla con la del sistema de diseño cuando aquella acepte navegación.
 *
 * <p>Se cierra con el fondo, con el aspa y con la tecla de escape: quedarse encerrado dentro de una
 * imagen es de las cosas que más irritan.
 */
@Component({
  selector: 'nx-visor-galeria',
  imports: [FaIconComponent],
  template: `
    <div
      class="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center overscroll-contain"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="titulo()"
    >
      <div class="absolute inset-0 cursor-zoom-out" (click)="cierra.emit()" aria-hidden="true"></div>
      <img
        [src]="src()"
        [alt]="titulo()"
        class="relative max-w-[100vw] max-h-dvh w-auto h-auto object-contain p-2"
      />
      @if (total() > 1) {
        <button
          type="button"
          (click)="anterior.emit()"
          [attr.aria-label]="t('quickview.prev')"
          class="btn btn-circle btn-ghost text-white bg-black/40 absolute left-3 top-1/2 -translate-y-1/2"
        >
          <fa-icon [icon]="iconos.izquierda" class="text-xl" />
        </button>
        <button
          type="button"
          (click)="siguiente.emit()"
          [attr.aria-label]="t('quickview.next')"
          class="btn btn-circle btn-ghost text-white bg-black/40 absolute right-3 top-1/2 -translate-y-1/2"
        >
          <fa-icon [icon]="iconos.derecha" class="text-xl" />
        </button>
        <span
          class="absolute bottom-4 left-1/2 -translate-x-1/2 text-[12px] text-white/90 px-2.5 py-1 rounded-full bg-white/10"
        >
          {{ indice() + 1 }} / {{ total() }}
        </span>
      }
      <button
        type="button"
        (click)="cierra.emit()"
        [attr.aria-label]="t('quickview.close')"
        class="btn btn-circle btn-ghost text-white bg-black/40 hover:bg-black/60 absolute top-3 right-3 z-10"
      >
        <fa-icon [icon]="iconos.aspa" class="text-xl" />
      </button>
    </div>
  `,
  host: {
    '(document:keydown.escape)': 'cierra.emit()',
    '(document:keydown.arrowleft)': 'anterior.emit()',
    '(document:keydown.arrowright)': 'siguiente.emit()',
  },
})
export class VisorGaleria {
  readonly src = input.required<string>();
  readonly titulo = input('');
  readonly indice = input(0);
  readonly total = input(1);

  readonly cierra = output<void>();
  readonly anterior = output<void>();
  readonly siguiente = output<void>();

  protected readonly t = inject(TraduccionService).t;
  protected readonly iconos = { izquierda: faChevronLeft, derecha: faChevronRight, aspa: faXmark };
}
