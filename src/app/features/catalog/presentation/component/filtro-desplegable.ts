import { Component, input, model } from '@angular/core';

export interface OpcionDeFiltro {
  readonly valor: string;
  readonly etiqueta: string;
}

/**
 * Un filtro de lista desplegable, con su rótulo.
 *
 * <p>PIEZA PROVISIONAL. Su sitio es el sistema de diseño —la barra de filtros la comparten el catálogo
 * y siete pantallas del panel—, pero esa capa la está portando otro equipo ahora mismo. Se deja aquí
 * lo mínimo, con el mismo marcado del original, y se anota para unificarlo después.
 *
 * <p>El desplegable nativo es deliberado: en el móvil abre la rueda del sistema, que es táctil,
 * accesible y no hay que reinventar.
 */
@Component({
  selector: 'nx-filtro-desplegable',
  template: `
    <label class="inline-flex items-center gap-1.5 text-[12px]">
      <span class="text-ink-500">{{ etiqueta() }}</span>
      <select
        class="select select-bordered select-sm text-[12px] min-h-11 sm:min-h-8"
        [value]="valor() ?? ''"
        (change)="elige($event)"
        [attr.aria-label]="etiqueta()"
      >
        @if (marcador()) {
          <option value="">{{ marcador() }}</option>
        }
        @for (opcion of opciones(); track opcion.valor) {
          <option [value]="opcion.valor">{{ opcion.etiqueta }}</option>
        }
      </select>
    </label>
  `,
})
export class FiltroDesplegable {
  readonly etiqueta = input.required<string>();
  readonly opciones = input.required<readonly OpcionDeFiltro[]>();
  readonly marcador = input('');
  readonly valor = model<string | null>(null);

  protected elige(evento: Event): void {
    const elegido = (evento.target as HTMLSelectElement).value;
    this.valor.set(elegido || null);
  }
}
