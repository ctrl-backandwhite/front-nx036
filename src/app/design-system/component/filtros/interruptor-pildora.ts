import { Component, computed, input, model } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/free-solid-svg-icons';

/** El filtro de sí o no, con forma de pastilla: un interruptor dentro de una etiqueta. */
@Component({
  selector: 'nx-interruptor-pildora',
  imports: [FaIconComponent],
  template: `
    <label
      [class]="
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] cursor-pointer transition-colors ' +
        clases()
      "
    >
      @if (icono(); as adorno) {
        <fa-icon [icon]="adorno" class="text-[10px] opacity-70" />
      }
      <span>{{ etiqueta() }}</span>
      <input
        type="checkbox"
        class="toggle toggle-primary toggle-xs"
        [checked]="marcado()"
        (change)="cambia($event)"
      />
    </label>
  `,
})
export class InterruptorPildora {
  readonly etiqueta = input.required<string>();
  readonly marcado = model(false);
  readonly icono = input<IconDefinition | undefined>(undefined);

  /** Igual que en el filtro de selección: las variantes con `hover:` no caben en `[class.x]`. */
  protected readonly clases = computed(() =>
    this.marcado()
      ? 'border-primary/40 bg-primary/5 text-base-content'
      : 'border-base-300 bg-base-100 text-base-content/80 hover:border-base-content/30',
  );

  protected cambia(evento: Event): void {
    this.marcado.set((evento.target as HTMLInputElement).checked);
  }
}
