import { Component, input } from '@angular/core';

/**
 * El marco de una página de error: el número grande, el titular y la explicación.
 *
 * <p>Se comparte entre el 404 y el 500 para que las dos se vean iguales. Los botones los pone quien la
 * monta, porque son lo único que cambia: del 404 se sale navegando a otro sitio, y del 500 se sale
 * reintentando.
 *
 * <p>MOBILE FIRST: una sola columna centrada, con el ancho limitado para que la frase no cruce la
 * pantalla de un extremo a otro en el escritorio.
 */
@Component({
  selector: 'nx-marco-de-error',
  template: `
    <div class="min-h-[70vh] flex items-center justify-center px-4">
      <div class="max-w-lg text-center">
        <!--
          El número es DECORATIVO: quien usa un lector de pantalla ya oye el titular, y «cuatrocientos
          cuatro» leído suelto delante no aporta nada.
        -->
        <div
          aria-hidden="true"
          class="text-[120px] leading-none font-bold text-brand-600 tracking-tighter"
        >
          {{ codigo() }}
        </div>
        <h1 class="mt-4 text-2xl font-medium">{{ titulo() }}</h1>
        <p class="mt-3 text-ink-600">{{ cuerpo() }}</p>
        <div class="mt-6 flex flex-wrap gap-2 justify-center">
          <ng-content />
        </div>
      </div>
    </div>
  `,
})
export class MarcoDeError {
  readonly codigo = input.required<string>();
  readonly titulo = input.required<string>();
  readonly cuerpo = input.required<string>();
}
