import { DOCUMENT, Directive, ElementRef, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

/** Un segundo de entrada, la duración que usa toda la aplicación para el contenido. */
const DURACION_MS = 1000;

/**
 * La entrada suave de cada pantalla al navegar.
 *
 * <p>Se anima con la API de animaciones del NAVEGADOR y no con una clase: una animación por CSS solo se
 * reproduce cuando el elemento se crea, y aquí el contenedor es siempre el mismo —lo que cambia es lo
 * que hay dentro—. Repetirla obligaría a quitar y volver a poner la clase forzando un recálculo de
 * estilos por medio, que es más frágil que pedir la animación directamente.
 *
 * <p>Con movimiento reducido no se anima nada: para mucha gente esto no es un adorno sino un mareo.
 */
@Directive({ selector: '[nxTransicionPagina]' })
export class TransicionPagina {
  private readonly anfitrion = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly ventana = inject(DOCUMENT).defaultView;
  private readonly enrutador = inject(Router);

  private readonly ruta = toSignal(
    this.enrutador.events.pipe(
      filter((evento) => evento instanceof NavigationEnd),
      // Sin la parte de consulta: cambiar un filtro NO es cambiar de pantalla. Con la dirección
      // entera, cada pausa al teclear en el buscador lanzaba una navegación y la lista —y la propia
      // caja de búsqueda, que va dentro— desaparecía y volvía a aparecer durante un segundo. Escribir
      // tres palabras hacía parpadear el catálogo tres veces: se lee como que se ha roto.
      map((evento) => evento.urlAfterRedirects.split('?')[0]),
    ),
    { initialValue: this.enrutador.url },
  );

  constructor() {
    effect(() => {
      // Se LEE la ruta para depender de ella: cada navegación vuelve a ejecutar el efecto.
      this.ruta();
      this.anima();
    });
  }

  private anima(): void {
    const elemento = this.anfitrion.nativeElement;
    if (typeof elemento.animate !== 'function' || this.reduceMovimiento()) {
      return;
    }
    elemento.animate(
      [
        { opacity: 0, transform: 'translateY(8px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: DURACION_MS, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
    );
  }

  private reduceMovimiento(): boolean {
    return this.ventana?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true;
  }
}
