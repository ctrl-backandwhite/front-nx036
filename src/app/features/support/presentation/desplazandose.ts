import { DestroyRef, Service, inject, signal } from '@angular/core';
import { esNavegador } from '@core/platform/plataforma';

/** Cuánto se espera tras el último empujón antes de dar por terminado el desplazamiento. */
const REPOSO_MS = 250;

/**
 * Dice si la página se está desplazando en este momento.
 *
 * <p>Sirve para APARTAR lo que flota por encima del contenido —el asistente, el chat— mientras alguien
 * navega. Un elemento fijo en una esquina es cómodo cuando se le busca y un estorbo cuando no: en el
 * catálogo se planta justo sobre el precio y el botón de la fila que va pasando por debajo.
 *
 * <p>Vuelve a falso un cuarto de segundo después del último empujón. Ese retardo es lo que evita que el
 * asistente parpadee en cada sacudida del dedo.
 *
 * <p>El oyente va como `passive`: este oyente no va a cancelar el gesto, y decírselo al navegador le
 * permite desplazar sin esperar a que termine. Sin eso, se nota el tirón en el móvil.
 *
 * <p>NOTA: por el inventario del porte, esto pertenece al sistema de diseño —lo usan el asistente y el
 * chat—. Mientras no exista allí, vive aquí para no bloquear el porte de este contexto.
 */
@Service()
export class Desplazandose {
  private readonly _activo = signal(false);
  readonly activo = this._activo.asReadonly();

  constructor() {
    if (!esNavegador()) {
      return;
    }
    let reposo: ReturnType<typeof setTimeout>;
    const alDesplazar = (): void => {
      this._activo.set(true);
      clearTimeout(reposo);
      reposo = setTimeout(() => this._activo.set(false), REPOSO_MS);
    };
    window.addEventListener('scroll', alDesplazar, { passive: true });
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('scroll', alDesplazar);
      clearTimeout(reposo);
    });
  }
}
