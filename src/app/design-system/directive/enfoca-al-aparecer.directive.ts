import { Directive, ElementRef, afterNextRender, booleanAttribute, inject, input } from '@angular/core';

/**
 * Lleva el foco al campo en cuanto aparece.
 *
 * <p>Es lo que hacía el atributo `autofocus` del otro front, pero acotado a donde de verdad
 * corresponde: un diálogo o un panel que se acaba de abrir a propósito. La diferencia importa —el
 * atributo se aplica al CARGAR la página, robando el foco a quien todavía está leyendo, y por eso está
 * prohibido en el proyecto; esto ocurre solo cuando alguien ha pedido abrir algo, que es justo cuando
 * se espera poder escribir sin volver a apuntar con el ratón.
 *
 * <p>`afterNextRender` y no el constructor: al prerenderizar no hay foco que mover, y el elemento aún
 * no está en el documento.
 */
@Directive({ selector: '[nxEnfocaAlAparecer]' })
export class EnfocaAlAparecer {
  /**
   * Permite decidirlo por cada elemento sin duplicar el marcado: en un formulario con varios campos,
   * solo el PRIMERO se lleva el foco.
   */
  readonly nxEnfocaAlAparecer = input(true, { transform: booleanAttribute });

  private readonly anfitrion = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    afterNextRender(() => {
      if (this.nxEnfocaAlAparecer()) {
        this.anfitrion.nativeElement.focus();
      }
    });
  }
}
