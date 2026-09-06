import { Directive, ElementRef, Renderer2, afterNextRender, inject, input } from '@angular/core';

/**
 * La silueta de una fila de tabla mientras el panel carga.
 *
 * <p>Es una DIRECTIVA y no un componente porque el elemento tiene que ser un `<tr>` de verdad: un
 * `<nx-...>` entre el `<tbody>` y sus filas rompe la tabla —el navegador lo saca fuera— y el proyecto
 * solo admite componentes con selector de elemento. Así que la fila la escribe quien la usa y esto
 * únicamente la rellena de celdas.
 *
 * <p>Las celdas se crean con `Renderer2` en vez de con una plantilla por el mismo motivo: una directiva
 * no tiene plantilla, y el marcado que hace falta —`<td>` dentro de `<tr>`— no admite envoltorios.
 */
@Directive({
  selector: 'tr[nxEsqueletoFilaTabla]',
  host: { class: 'border-t border-ink-100' },
})
export class EsqueletoFilaTabla {
  readonly nxEsqueletoFilaTabla = input.required<number>();

  private readonly anfitrion = inject<ElementRef<HTMLTableRowElement>>(ElementRef);
  private readonly pintor = inject(Renderer2);

  constructor() {
    afterNextRender(() => this.rellena());
  }

  private rellena(): void {
    const fila = this.anfitrion.nativeElement;
    for (let i = 0; i < this.nxEsqueletoFilaTabla(); i++) {
      const celda = this.pintor.createElement('td');
      this.pintor.setAttribute(celda, 'class', 'px-4 py-2');
      const bloque = this.pintor.createElement('div');
      this.pintor.setAttribute(bloque, 'class', 'skeleton h-3');
      this.pintor.setAttribute(bloque, 'aria-hidden', 'true');
      this.pintor.appendChild(celda, bloque);
      this.pintor.appendChild(fila, celda);
    }
  }
}
