import { Component, inject, input, model } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';

/**
 * Un contador de módulo para los identificadores de los campos.
 *
 * <p>No vale un `id` fijo escrito a mano: el mismo componente puede montarse dos veces en la página
 * —hay tres campos editables seguidos— y dos elementos con el mismo `id` rompen la asociación de la
 * etiqueta, que es justo lo que se quiere garantizar. `crypto.randomUUID()` haría lo mismo, pero un
 * contador da identificadores estables entre renderizados y legibles al depurar.
 */
let contador = 0;

/**
 * Un dato del perfil en modo lectura.
 *
 * <p>Cuando no hay valor se pinta una raya y no un hueco: un espacio en blanco se lee como un fallo de
 * carga, mientras que la raya dice «esto está vacío» sin ambigüedad.
 */
@Component({
  selector: 'nx-perfil-campo',
  template: `
    <div class="text-sm">
      <div class="text-[11px] tracking-wide text-ink-500 mb-0.5 flex items-center gap-1">
        <span>{{ etiqueta() }}</span>
        @if (soloLectura()) {
          <span class="text-[10px] text-ink-400">· {{ t('admin.profile.read_only') }}</span>
        }
      </div>
      <div class="font-medium">{{ valor() || '—' }}</div>
    </div>
  `,
})
export class PerfilCampo {
  readonly etiqueta = input.required<string>();
  readonly valor = input<string>();
  /** Marca el dato como no editable desde aquí (el correo y el papel los cambia otra pantalla). */
  readonly soloLectura = input(false);

  protected readonly t = inject(TraduccionService).t;
}

/**
 * El mismo dato, pero editable.
 *
 * <p>La etiqueta es un `<label for>` de verdad. Antes era un `<div>` que solo lo PARECÍA: el campo se
 * quedaba sin nombre accesible —un lector de pantalla anunciaba «cuadro de edición» a secas— y pulsar
 * el texto no enfocaba nada.
 */
@Component({
  selector: 'nx-perfil-campo-editable',
  template: `
    <div class="text-sm">
      <label [attr.for]="id"
             class="text-[11px] uppercase tracking-wider text-ink-400 mb-0.5 block">{{ etiqueta() }}</label>
      <input [id]="id" class="input w-full text-[13px]" [value]="valor()" (input)="escribe($event)" />
      @if (ayuda(); as texto) {
        <div class="text-[10px] text-ink-400 mt-0.5">{{ texto }}</div>
      }
    </div>
  `,
})
export class PerfilCampoEditable {
  readonly etiqueta = input.required<string>();
  readonly ayuda = input<string>();
  readonly valor = model.required<string>();

  protected readonly id = `nx-perfil-campo-${++contador}`;

  protected escribe(evento: Event): void {
    this.valor.set((evento.target as HTMLInputElement).value);
  }
}
