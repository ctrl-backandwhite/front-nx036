import { Component, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/free-solid-svg-icons';

/** Una cifra grande con su rótulo: clics, conversiones o dinero. */
@Component({
  selector: 'nx-tarjeta-indicador',
  imports: [FaIconComponent],
  template: `
    <div class="card p-4">
      <div class="text-[11px] uppercase tracking-wider text-ink-500 flex items-center gap-1">
        <fa-icon [icon]="icono()" class="text-[10px]" /> {{ etiqueta() }}
      </div>
      <div [class]="'text-xl font-semibold mt-1 ' + tono()">{{ valor() }}</div>
    </div>
  `,
})
export class TarjetaIndicador {
  readonly icono = input.required<IconDefinition>();
  readonly etiqueta = input.required<string>();
  readonly valor = input.required<string>();
  readonly tono = input('');
}
