import { Component, effect, input, model } from '@angular/core';

/** Una subdivisión de primer nivel: el código es lo que el backend usa para el impuesto por estado. */
export interface Provincia {
  readonly code: string;
  readonly name: string;
}

/**
 * El estado o provincia del país elegido.
 *
 * <p>Con provincias conocidas es un desplegable —el valor viaja como código, «CA», «ON», «SP», que es
 * lo que el backend necesita para el impuesto por estado—; sin ellas cae a un campo de texto libre, por
 * los países que todavía no se han sembrado. El mismo control en las direcciones y en el pago.
 *
 * <p>Las provincias LLEGAN de fuera: pedirlas al backend es trabajo de un caso de uso, no de una pieza
 * del sistema de diseño. Aquí solo se eligen.
 */
@Component({
  selector: 'nx-selector-provincia',
  template: `
    @if (provincias().length > 0) {
      <select
        [value]="valor()"
        (change)="elige($event)"
        [class]="claseSelect()"
        [attr.aria-label]="etiqueta() || marcador()"
      >
        <option value="">{{ marcador() }}</option>
        @for (provincia of provincias(); track provincia.code) {
          <option [value]="provincia.code" [selected]="provincia.code === valor()">
            {{ provincia.name }}
          </option>
        }
      </select>
    } @else {
      <input
        [value]="valor()"
        (input)="escribe($event)"
        [placeholder]="marcador()"
        [class]="claseInput()"
        [attr.aria-label]="etiqueta() || marcador()"
      />
    }
  `,
})
export class SelectorProvincia {
  readonly valor = model('');
  readonly provincias = input<readonly Provincia[]>([]);
  readonly claseSelect = input('');
  readonly claseInput = input('');
  readonly marcador = input.required<string>();
  readonly etiqueta = input('');

  constructor() {
    // Al cambiar a un país CON provincias, un valor que no sea uno de sus códigos se limpia: si no, se
    // arrastraría el texto libre del país anterior haciéndose pasar por código y el impuesto saldría mal.
    effect(() => {
      const lista = this.provincias();
      const actual = this.valor();
      if (lista.length > 0 && actual && !lista.some((p) => p.code === actual)) {
        this.valor.set('');
      }
    });
  }

  protected elige(evento: Event): void {
    this.valor.set((evento.target as HTMLSelectElement).value);
  }

  protected escribe(evento: Event): void {
    this.valor.set((evento.target as HTMLInputElement).value);
  }
}
