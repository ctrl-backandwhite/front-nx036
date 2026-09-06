import { DestroyRef, Injectable, inject, signal } from '@angular/core';

/** Cuánto se queda el «Copiado» en pantalla. Lo justo para verlo sin que se quede clavado. */
const AVISO_MS = 1200;

/**
 * Copiar al portapapeles y avisar de que se ha copiado.
 *
 * <p>TRAMPA, y cara: `navigator.clipboard` NO existe fuera de contexto seguro —cualquier `http://`, y
 * el desarrollo local va por ahí— y el navegador RECHAZA la escritura si la pestaña no tiene el foco o
 * el permiso está denegado. Sin el `?.` y sin capturar el rechazo, el clic lanzaba una excepción dentro
 * del manejador y se llevaba por delante la página entera de documentación, además de dejar una
 * promesa rechazada sin atender.
 *
 * <p>Y lo segundo, igual de importante: si NO se ha copiado, no se anuncia «Copiado». Decir que se
 * copió algo que no está en el portapapeles hace que la gente pegue lo anterior sin saberlo.
 *
 * <p>Se declara con `@Injectable` sin raíz y se provee en cada componente que lo usa, para que cada
 * bloque de código tenga su propio «Copiado» y no se enciendan todos a la vez.
 */
@Injectable()
export class CopiaAlPortapapeles {
  private readonly _copiado = signal(false);
  readonly copiado = this._copiado.asReadonly();

  private temporizador: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.temporizador));
  }

  copia(texto: string): void {
    navigator.clipboard
      ?.writeText(texto)
      .then(() => {
        this._copiado.set(true);
        clearTimeout(this.temporizador);
        this.temporizador = setTimeout(() => this._copiado.set(false), AVISO_MS);
      })
      .catch(() => {
        /* Sin permiso de portapapeles: el botón se queda como estaba y no se miente. */
      });
  }
}
