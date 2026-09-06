import { Component, inject, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';

/**
 * El marco de una ventana emergente del panel.
 *
 * <p>PIEZA PROVISIONAL: le corresponde al sistema de diseño y todavía no existe allí. Se hace aquí la
 * versión mínima para no bloquear el porte del catálogo; cuando `@ds` publique la suya, se sustituye y
 * este fichero desaparece.
 *
 * <p>MOBILE FIRST: en el móvil ocupa casi toda la pantalla y se desplaza por dentro; a partir de `sm`
 * se centra con el ancho que pida quien la monta. Cerrar pulsando fuera se hace en la capa oscura, no
 * en el contenido, para que arrastrar dentro del formulario no cierre la ventana.
 */
@Component({
  selector: 'nx-ventana-modal',
  imports: [FaIconComponent],
  template: `
    <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        class="absolute inset-0 bg-black/40"
        [attr.aria-label]="t('dialog.close')"
        (click)="cierra.emit()"
      ></button>
      <div
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="titulo()"
        [class]="
          'relative bg-base-100 rounded-t-box sm:rounded-box shadow-xl w-full ' +
          ancho() +
          ' max-h-[92vh] flex flex-col border border-base-200'
        "
      >
        <div class="flex items-center justify-between gap-2 px-4 py-3 border-b border-ink-100 shrink-0">
          <h3 class="font-semibold text-base sm:text-lg">{{ titulo() }}</h3>
          <button
            type="button"
            class="btn btn-ghost btn-sm btn-square"
            [attr.aria-label]="t('dialog.close')"
            (click)="cierra.emit()"
          >
            <fa-icon [icon]="iconoAspa" />
          </button>
        </div>
        <div class="px-4 py-3 overflow-y-auto flex-1 min-h-0">
          <ng-content />
        </div>
        <div class="px-4 py-3 border-t border-ink-100 shrink-0 flex justify-end gap-2 flex-wrap">
          <ng-content select="[pie]" />
        </div>
      </div>
    </div>
  `,
})
export class VentanaModal {
  readonly titulo = input.required<string>();
  /** Ancho máximo en el escritorio. En el móvil siempre ocupa todo el ancho. */
  readonly ancho = input('sm:max-w-md');
  readonly cierra = output<void>();

  protected readonly iconoAspa = faXmark;
  protected readonly t = inject(TraduccionService).t;
}
