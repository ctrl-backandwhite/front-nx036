import { Component, input, model } from '@angular/core';

/**
 * Un filtro numérico de la barra.
 *
 * <p>`inputmode="decimal"` para que el teclado del móvil abra en números, y `type="text"` en vez de
 * `type="number"`: el numérico se come el valor cuando está a medio escribir —una coma suelta— y además
 * añade unas flechas que aquí no pintan nada.
 */
@Component({
  selector: 'nx-filtro-numerico',
  template: `
    <label class="flex items-center gap-1 text-[11px] text-ink-500">
      {{ etiqueta() }}
      <input
        type="text"
        inputmode="decimal"
        [value]="valor()"
        (input)="escribe($event)"
        [attr.aria-label]="etiqueta()"
        [class]="'input input-sm input-bordered text-[12px] ' + ancho()"
      />
    </label>
  `,
})
export class FiltroNumerico {
  readonly etiqueta = input.required<string>();
  readonly valor = model('');
  readonly ancho = input('w-20');

  protected escribe(evento: Event): void {
    this.valor.set((evento.target as HTMLInputElement).value);
  }
}
