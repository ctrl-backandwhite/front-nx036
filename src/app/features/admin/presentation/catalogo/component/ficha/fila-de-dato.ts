import { Component, input } from '@angular/core';
import { GuiaPuntos } from '@ds/component/guia-puntos/guia-puntos';

/**
 * Una fila «etiqueta … valor» del resumen de la ficha.
 *
 * <p>La línea de puntos la pone `nx-guia-puntos`, que se estira hasta llenar el hueco: así los valores
 * quedan alineados a la derecha sea cual sea el largo de la etiqueta y el idioma —el alemán y el
 * neerlandés son mucho más largos que el chino—.
 */
@Component({
  selector: 'nx-fila-de-dato',
  imports: [GuiaPuntos],
  template: `
    <div class="flex items-baseline text-[13px]">
      <span class="text-ink-500 whitespace-nowrap">{{ etiqueta() }}</span>
      <nx-guia-puntos />
      <span class="font-medium text-right whitespace-nowrap" [class.font-mono]="monoespaciado()">
        {{ valor() }}
      </span>
    </div>
  `,
})
export class FilaDeDato {
  readonly etiqueta = input.required<string>();
  readonly valor = input.required<string>();
  readonly monoespaciado = input(false);
}
