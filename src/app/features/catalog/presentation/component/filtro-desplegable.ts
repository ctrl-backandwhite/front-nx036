import { Component, input, model } from '@angular/core';
import { FormField, form, transformedValue } from '@angular/forms/signals';

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
  imports: [FormField],
  template: `
    <label class="inline-flex items-center gap-1.5 text-[12px]">
      <span class="text-ink-500">{{ etiqueta() }}</span>
      <select
        class="select select-bordered select-sm text-[12px] min-h-11 sm:min-h-8"
        [formField]="formulario"
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
  /** Sin filtro puesto es `null`, no cadena vacía: así el padre distingue «todos» de «vacío». */
  readonly valor = model<string | null>(null);

  /**
   * El puente entre el dato del negocio y lo que el desplegable nativo sabe manejar.
   *
   * <p>El `<select>` solo habla en cadenas y su hueco de «todos» es la cadena vacía, mientras que el
   * criterio de búsqueda distingue el nulo. La traducción va en los DOS sentidos y en un solo sitio,
   * de modo que el padre sigue recibiendo `null` y no una cadena vacía que acabaría colándose en la
   * dirección del navegador como un filtro puesto que no filtra nada.
   */
  private readonly elegido = transformedValue(this.valor, {
    parse: (crudo: string) => ({ value: crudo || null }),
    format: (valor: string | null) => valor ?? '',
  });

  /**
   * El desplegable no tiene reglas que declarar —las opciones son las que son—, pero pasa por el
   * formulario igual que el resto: es lo que da el enlace con la directiva y, con él, el estado de
   * tocado y sucio que antes había que inventarse en cada pantalla.
   */
  protected readonly formulario = form(this.elegido);
}
