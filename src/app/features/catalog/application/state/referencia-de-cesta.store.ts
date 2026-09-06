import { Injectable, signal } from '@angular/core';

/**
 * Qué productos lleva ya el comprador. Es la REFERENCIA contra la que el backend calcula cuánto
 * arancel suma cada producto del listado.
 *
 * <p>Se congela a propósito mientras el listado está desplegado: la referencia entra en la clave de la
 * consulta, así que refrescarla con veinte páginas cargadas las tiraría todas y devolvería al comprador
 * al principio de golpe. Quedarse con la de antes solo puede hacer que se prometa «+3,00 €» de algo que
 * acaba de salir gratis, nunca al revés: se promete de más, jamás de menos.
 */
@Injectable()
export class ReferenciaDeCestaStore {
  private readonly _productos = signal<readonly string[]>([]);
  readonly productos = this._productos.asReadonly();

  fija(productos: readonly string[]): void {
    this._productos.set(productos);
  }

  /** ¿Lleva algo? Decide si el enlace de «los que no suman arancel» apunta al carrito o a un grupo. */
  hayCesta(): boolean {
    return this._productos().length > 0;
  }
}
