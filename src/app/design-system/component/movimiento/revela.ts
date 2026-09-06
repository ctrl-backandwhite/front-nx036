import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  signal,
} from '@angular/core';

/**
 * El bloque que aparece al llegar a él.
 *
 * <p>Una sola vez y solo hacia abajo: repetir la entrada al subir marea. El margen negativo hace que la
 * animación empiece un poco ANTES de que el bloque asome, para que se vea entrar y no ya entrado.
 *
 * <p>La animación es la clase `animate-section-fade` de la hoja central, no una librería: el efecto es
 * el mismo fundido con desplazamiento que usan la transición de página y el buzón, y así respeta sola
 * la preferencia de movimiento reducido del sistema.
 */
@Component({
  selector: 'nx-revela',
  template: '<ng-content />',
  host: {
    '[class.animate-section-fade]': 'visible()',
    '[style.animation-delay]': 'visible() ? retardo() + "ms" : null',
    // Invisible hasta que le toca: sin esto el bloque se vería un instante antes de animarse.
    '[style.opacity]': 'visible() ? null : "0"',
  },
})
export class Revela {
  /** Milisegundos de espera antes de arrancar. Sirve para escalonar una fila de tarjetas. */
  readonly retardo = input(0);

  protected readonly visible = signal(false);

  private readonly anfitrion = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destruccion = inject(DestroyRef);

  constructor() {
    // Solo en el navegador: al prerenderizar no hay observador ni pantalla a la que asomarse, y el
    // bloque tiene que salir ya visible en el HTML servido.
    afterNextRender(() => {
      if (typeof IntersectionObserver === 'undefined') {
        this.visible.set(true);
        return;
      }
      const observador = new IntersectionObserver(
        (entradas) => {
          if (entradas.some((e) => e.isIntersecting)) {
            this.visible.set(true);
            observador.disconnect();
          }
        },
        { rootMargin: '-10% 0px' },
      );
      observador.observe(this.anfitrion.nativeElement);
      this.destruccion.onDestroy(() => observador.disconnect());
    });
  }
}
