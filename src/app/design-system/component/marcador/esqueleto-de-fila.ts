import { Component, computed, input } from '@angular/core';
import { Esqueleto } from './esqueleto';

/**
 * La silueta de una fila de tabla mientras llegan los datos.
 *
 * <p>La usan todas las tablas del panel, así que vive aquí y no en una de ellas.
 *
 * <p>Hubo un tiempo en que había DOS: esta y una directiva `tr[nxEsqueletoFilaTabla]` que creaba las
 * celdas con `Renderer2`. Se quedó esta y la directiva se borró. Además de que la directiva no la
 * usaba nadie, creaba las celdas en `afterNextRender`, o sea DESPUÉS de pintar: al prerenderizar, el
 * HTML salía con la fila vacía. Esta se pinta con la plantilla, así que existe también en el servidor.
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
