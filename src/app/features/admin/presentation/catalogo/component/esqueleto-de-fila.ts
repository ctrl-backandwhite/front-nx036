import { Component, computed, input } from '@angular/core';
import { Esqueleto } from '@ds/component/marcador/esqueleto';

/**
 * La silueta de una fila de tabla mientras llegan los datos.
 *
 * <p>PIEZA PROVISIONAL en esta carpeta: le corresponde al sistema de diseño —la usan todas las tablas
 * del panel— y la que había allí desapareció mientras se portaba esta área. Cuando `@ds` vuelva a
 * publicarla, se sustituye y este fichero se borra.
 *
 * <p>Es un elemento propio dentro del `<tbody>` con `display: table-row` (la utilidad `table-row`): así
 * el selector cumple la norma del proyecto —todo componente empieza por `nx-`— y la fila sigue
 * maquetándose como una fila. Angular construye el árbol por su cuenta, así que no pasa por las reglas
 * de reubicación del analizador de HTML del navegador.
 */
@Component({
  selector: 'nx-esqueleto-de-fila',
  imports: [Esqueleto],
  template: `
    @for (indice of indices(); track indice) {
      <td class="px-4 py-2"><nx-esqueleto clase="h-3" /></td>
    }
  `,
  host: { class: 'table-row border-t border-ink-100', 'aria-hidden': 'true' },
})
export class EsqueletoDeFila {
  readonly columnas = input.required<number>();

  /** El flujo `@for` necesita algo que recorrer: el número se convierte en la lista de sus índices. */
  protected readonly indices = computed(() =>
    Array.from({ length: this.columnas() }, (_, i) => i),
  );
}
