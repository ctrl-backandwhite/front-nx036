import { Component, inject, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';

/**
 * La imagen ampliada a pantalla completa.
 *
 * <p>Se cierra con Escape, con el aspa y pulsando fuera de la foto. Las tres hacen falta: en el móvil no
 * hay teclado y el aspa queda lejos del pulgar, y en el escritorio Escape es lo que se prueba primero.
 */
@Component({
  selector: 'nx-visor-de-imagen',
  imports: [FaIconComponent],
  template: `
    <div class="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6">
      <button
        type="button"
        class="absolute inset-0 w-full h-full"
        [attr.aria-label]="t('dialog.close')"
        (click)="cierra.emit()"
      ></button>
      <button
        type="button"
        class="absolute top-4 right-4 btn btn-circle btn-ghost text-white text-xl hover:bg-white/20"
        [title]="t('dialog.close')"
        [attr.aria-label]="t('dialog.close')"
        (click)="cierra.emit()"
      >
        <fa-icon [icon]="iconoAspa" />
      </button>
      <img [src]="src()" [alt]="alt()" class="relative max-w-full max-h-full rounded shadow-2xl" />
    </div>
  `,
  host: { '(document:keydown.escape)': 'cierra.emit()' },
})
export class VisorDeImagen {
  readonly src = input.required<string>();
  readonly alt = input.required<string>();
  readonly cierra = output<void>();

  protected readonly iconoAspa = faXmark;
  protected readonly t = inject(TraduccionService).t;
}
