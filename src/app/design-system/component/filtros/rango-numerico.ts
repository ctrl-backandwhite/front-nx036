import { Component, input, model } from '@angular/core';

/**
 * El filtro de mínimo y máximo, con un rótulo único y un prefijo opcional (el símbolo de la moneda).
 *
 * <p>DEUDA CONOCIDA: los dos campos están cableados a mano —`[value]` más `(input)`— y las normas del
 * proyecto piden Signal Forms. Se intentó y se revirtió, y conviene dejar escrito por qué para que el
 * siguiente no repita el intento: la pieza publica hacia fuera por dos `model()`, y un formulario
 * interno solo puede propagarles el valor con un efecto, que NO es síncrono. Una prueba real —teclear
 * y leer `minimo()` a continuación— deja de pasar, y con razón: quien usa esta pieza espera el valor
 * en cuanto se teclea.
 *
 * <p>El arreglo de verdad no es meterle un formulario dentro, sino que reciba el CAMPO del formulario
 * de quien la usa, como hace `[formField]`. Eso cambia su interfaz y toca las ocho pantallas que la
 * usan, así que es un trabajo aparte y no un retoque.
 */
@Component({
  selector: 'nx-rango-numerico',
  template: `
    <div
      class="inline-flex items-center gap-1.5 text-[12px] rounded-full border border-ink-200 bg-white px-2 py-0.5"
    >
      <span class="text-ink-500 pl-1">{{ etiqueta() }}:</span>
      @if (prefijo()) {
        <span class="text-ink-400">{{ prefijo() }}</span>
      }
      <input
        type="number"
        inputmode="decimal"
        [placeholder]="marcadorMinimo()"
        [attr.aria-label]="etiqueta() + ' ' + marcadorMinimo()"
        [value]="minimo()"
        (input)="cambiaMinimo($event)"
        class="w-14 px-1 py-1 text-[12px] focus:outline-none bg-transparent"
      />
      <span class="text-ink-300">–</span>
      <input
        type="number"
        inputmode="decimal"
        [placeholder]="marcadorMaximo()"
        [attr.aria-label]="etiqueta() + ' ' + marcadorMaximo()"
        [value]="maximo()"
        (input)="cambiaMaximo($event)"
        class="w-14 px-1 py-1 text-[12px] focus:outline-none bg-transparent"
      />
    </div>
  `,
})
export class RangoNumerico {
  readonly etiqueta = input.required<string>();
  readonly minimo = model('');
  readonly maximo = model('');
  readonly prefijo = input('');
  readonly marcadorMinimo = input('0');
  readonly marcadorMaximo = input('∞');

  protected cambiaMinimo(evento: Event): void {
    this.minimo.set((evento.target as HTMLInputElement).value);
  }

  protected cambiaMaximo(evento: Event): void {
    this.maximo.set((evento.target as HTMLInputElement).value);
  }
}
