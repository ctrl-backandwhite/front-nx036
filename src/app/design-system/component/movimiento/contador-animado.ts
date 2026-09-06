import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { DOCUMENT } from '@angular/core';

/** Cuánto tarda en llegar a la cifra final. */
const DURACION_MS = 900;

/**
 * La cifra que sube contando en vez de aparecer de golpe.
 *
 * <p>Se usa en los cuadros de mando: ver el número crecer da la escala de un vistazo, mientras que un
 * salto seco pasa desapercibido. Con movimiento reducido activado se pone el valor directamente.
 */
@Component({
  selector: 'nx-contador-animado',
  template: '{{ texto() }}',
})
export class ContadorAnimado {
  readonly valor = input.required<number>();
  /** Da formato a la cifra —moneda, porcentaje—. Sin él se redondea y se separan los miles. */
  readonly formato = input<((n: number) => string) | undefined>(undefined);

  private readonly ventana = inject(DOCUMENT).defaultView;
  private readonly destruccion = inject(DestroyRef);
  private readonly actual = signal(0);
  private fotograma = 0;

  protected readonly texto = computed(() => {
    const dar = this.formato();
    const n = this.actual();
    return dar ? dar(n) : Math.round(n).toLocaleString();
  });

  constructor() {
    effect(() => {
      const destino = this.valor();
      if (this.reduceMovimiento()) {
        this.actual.set(destino);
        return;
      }
      this.anima(destino);
    });
    this.destruccion.onDestroy(() => this.ventana?.cancelAnimationFrame(this.fotograma));
  }

  private reduceMovimiento(): boolean {
    return this.ventana?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true;
  }

  private anima(destino: number): void {
    const ventana = this.ventana;
    if (!ventana) {
      this.actual.set(destino);
      return;
    }
    // El punto de partida se lee SIN suscribirse: leer el signal aquí volvería a disparar el efecto en
    // cada fotograma y la animación se reiniciaría sola sin llegar nunca al final.
    const desde = this.actual();
    const inicio = ventana.performance.now();
    ventana.cancelAnimationFrame(this.fotograma);
    const paso = (ahora: number) => {
      const avance = Math.min(1, (ahora - inicio) / DURACION_MS);
      // Desaceleración cúbica: arranca rápido y frena al llegar, que es como se lee una cifra.
      const suavizado = 1 - Math.pow(1 - avance, 3);
      this.actual.set(desde + (destino - desde) * suavizado);
      if (avance < 1) {
        this.fotograma = ventana.requestAnimationFrame(paso);
      }
    };
    this.fotograma = ventana.requestAnimationFrame(paso);
  }
}
