import { Component, input, model } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

/**
 * Un filtro de sí o no, con forma de pastilla.
 *
 * <p>PIEZA PROVISIONAL, igual que el desplegable: su sitio es el sistema de diseño.
 *
 * <p>La altura mínima de 44 píxeles en el móvil no es estética: es el objetivo táctil mínimo. Con la
 * altura de escritorio, en un teléfono se fallaba el toque y se acababa activando el filtro de al lado.
 */
@Component({
  selector: 'nx-filtro-interruptor',
  imports: [FaIconComponent],
  template: `
    <button
      type="button"
      role="switch"
      [attr.aria-checked]="activo()"
      (click)="activo.set(!activo())"
      class="chip inline-flex items-center gap-1.5 min-h-11 sm:min-h-8 px-3 text-[12px]"
      [class.chip-active]="activo()"
    >
      @if (icono()) {
        <fa-icon [icon]="icono()!" class="text-[11px]" />
      }
      {{ etiqueta() }}
    </button>
  `,
})
export class FiltroInterruptor {
  readonly etiqueta = input.required<string>();
  readonly icono = input<IconDefinition | undefined>(undefined);
  readonly activo = model(false);
}
