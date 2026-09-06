import { Component, input, linkedSignal, model } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';

/**
 * Un filtro numérico de la barra.
 *
 * <p>`inputmode="decimal"` para que el teclado del móvil abra en números, y `type="text"` en vez de
 * `type="number"`: el numérico se come el valor cuando está a medio escribir —una coma suelta— y además
 * añade unas flechas que aquí no pintan nada.
 *
 * <p>El campo lo gestiona un formulario, y el `set` del modelo es lo que publica hacia arriba: así el
 * componente sigue ofreciendo un `model` de dos direcciones a quien lo monta —el almacén de filtros no
 * es un formulario— sin necesitar un efecto que copie el valor de un signal a otro.
 */
@Component({
  selector: 'nx-filtro-numerico',
  imports: [FormField],
  template: `
    <label class="flex items-center gap-1 text-[11px] text-ink-500">
      {{ etiqueta() }}
      <input
        type="text"
        inputmode="decimal"
        [formField]="formulario.valor"
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

  private readonly modelo = linkedSignal<string, { valor: string }>({
    source: () => this.valor(),
    computation: (valor) => ({ valor }),
    set: (nuevo, escribe) => {
      escribe(nuevo);
      this.valor.set(nuevo.valor);
    },
  });

  /**
   * Sin reglas: el vacío significa «sin filtro» y un número a medio escribir —«1,»— tiene que poder
   * existir mientras se teclea. Quien decide si el texto vale como número es el almacén, que ya lo hace.
   */
  protected readonly formulario = form(this.modelo);
}
