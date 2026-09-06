import { AnimationCallbackEvent, Component, input } from '@angular/core';

/** Lo que dura el desvanecido de salida. Se corresponde con `--motion-slow` de la hoja central. */
const DURACION_SALIDA_MS = 1000;

/**
 * El contenido que entra con un fundido cuando termina de cargar.
 *
 * <p>La entrada es una clase de la hoja central; la SALIDA se hace con la API de animaciones del
 * navegador, porque `animate.leave` necesita saber cuándo ha terminado para retirar el nodo, y una
 * clase de animación no lo dice.
 */
@Component({
  selector: 'nx-fundido-contenido',
  template: `
    @if (muestra()) {
      <div animate.enter="animate-fade-in" (animate.leave)="desvanece($event)">
        <ng-content />
      </div>
    }
  `,
})
export class FundidoContenido {
  readonly muestra = input(false);

  protected desvanece(evento: AnimationCallbackEvent): void {
    const elemento = evento.target as HTMLElement;
    // Si el navegador no sabe animar —o hay movimiento reducido y la animación dura cero—, se retira sin
    // más: dejar el nodo esperando una animación que no llega lo dejaría colgado en la página.
    if (typeof elemento.animate !== 'function') {
      evento.animationComplete();
      return;
    }
    elemento
      .animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: DURACION_SALIDA_MS,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      })
      .finished.catch(() => undefined)
      .finally(() => evento.animationComplete());
  }
}
