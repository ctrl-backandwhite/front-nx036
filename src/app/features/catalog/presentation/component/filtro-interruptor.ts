import { Component, computed, input, model } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

/**
 * Un filtro de sí o no, con forma de pastilla: un interruptor dentro de una etiqueta.
 *
 * <p>La etiqueta ENVUELVE al interruptor a propósito. Así el texto forma parte del control —pulsar
 * «Envío gratis» lo enciende, no solo acertar en el interruptor, que mide milímetros— y el nombre
 * accesible sale del propio marcado, sin un `aria-label` que repita lo que ya está escrito al lado.
 *
 * <p>La altura mínima de 44 píxeles en el móvil no es estética: es el objetivo táctil mínimo. Con la
 * altura de escritorio, en un teléfono se fallaba el toque y se acababa activando el filtro de al lado.
 */
@Component({
  selector: 'nx-filtro-interruptor',
  imports: [FaIconComponent, FormField],
  template: `
    <label
      [class]="
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 min-h-11 sm:min-h-8 text-[12px] cursor-pointer transition-colors ' +
        clasesDelChip()
      "
    >
      @if (icono(); as adorno) {
        <fa-icon [icon]="adorno" class="text-[10px] opacity-70" />
      }
      <span>{{ etiqueta() }}</span>
      <input type="checkbox" class="toggle toggle-primary toggle-xs" [formField]="formulario" />
    </label>
  `,
})
export class FiltroInterruptor {
  readonly etiqueta = input.required<string>();
  readonly icono = input<IconDefinition | undefined>(undefined);
  readonly activo = model(false);

  /**
   * Un solo campo, pero con el mismo mecanismo que el resto: nada de cablearlo a mano. El formulario
   * escribe directamente en el `model`, así que quien monta la pastilla recibe el cambio sin que aquí
   * haya una copia intermedia que sincronizar.
   */
  protected readonly formulario = form(this.activo);

  /**
   * Las clases del chip van en UNA cadena y no en asociaciones sueltas: las variantes con `hover:`
   * llevan dos puntos, y `[class.hover:border-base-content/30]` no es un nombre de clase que Angular
   * sepa leer.
   */
  protected readonly clasesDelChip = computed(() =>
    this.activo()
      ? 'border-primary/40 bg-primary/5 text-base-content'
      : 'border-base-300 bg-base-100 text-base-content/80 hover:border-base-content/30',
  );
}
