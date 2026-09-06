import { DOCUMENT, Directive, inject, signal } from '@angular/core';

/** Píxeles bajados a partir de los cuales la barra despega del contenido. */
const UMBRAL = 4;

/**
 * Marca la barra fija con `data-scrolled` en cuanto la página se mueve.
 *
 * <p>Es lo que le da la sombra al despegarse del contenido: sin ella, al desplazarse, el texto pasa por
 * debajo de la barra y no se sabe cuál está encima de cuál. La regla que pinta la sombra vive en la
 * hoja central; aquí solo se dice cuándo.
 */
@Directive({
  selector: '[nxSombraAlDesplazar]',
  host: {
    '[attr.data-scrolled]': 'desplazada()',
    '(window:scroll)': 'revisa()',
  },
})
export class SombraAlDesplazar {
  private readonly ventana = inject(DOCUMENT).defaultView;
  protected readonly desplazada = signal(false);

  protected revisa(): void {
    this.desplazada.set((this.ventana?.scrollY ?? 0) > UMBRAL);
  }
}
