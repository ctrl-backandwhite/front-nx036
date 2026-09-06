import { Component, DestroyRef, ElementRef, effect, inject, input, signal } from '@angular/core';
import { Plataforma } from '@core/platform/plataforma';
import { Animo } from '../../domain/model/asistente';

/** Cuánto se desplazan las pupilas, en unidades del lienzo. Más sería bizquear. */
const RECORRIDO_PUPILA = 2.6;
/** A partir de esta distancia la mirada ya no se mueve más: pasado eso, mirar más no se nota. */
const ALCANCE_DE_LA_MIRADA = 260;

/**
 * El personaje del asistente.
 *
 * <p>Va en su propio componente para que sustituirlo por una ilustración profesional sea cambiar UNO,
 * sin tocar nada de la lógica: basta con respetar sus dos entradas.
 *
 * <p>Es un SVG propio: sin dependencias nuevas, sin licencias de terceros y sin kilobytes que
 * descargar.
 *
 * <p>Lo que le da carácter no es el dibujo: es que la cara cambie según lo que está pasando y que MIRE
 * adonde mira quien lo usa. La mirada es el gesto que más vida da y el más barato — sin él, el
 * personaje es un icono; con él, parece que atiende. Se apaga si duerme o si se ha pedido menos
 * movimiento, y se lee el puntero a lo sumo una vez por fotograma para no castigar el desplazamiento.
 *
 * <p>NOTA para quien mantenga el diseño: el flotar continuo del front anterior venía de una librería de
 * animación que aquí no existe, y reproducirlo pide un fotograma clave en la hoja de estilos, que está
 * centralizada. Mientras tanto, la expresión la llevan los ojos, la boca y la antena.
 */
@Component({
  selector: 'nx-personaje-del-asistente',
  template: `
    <svg
      [attr.width]="tamano()"
      [attr.height]="tamano()"
      viewBox="0 0 64 68"
      role="presentation"
      aria-hidden="true"
      [attr.data-mood]="animo()"
      class="personaje-asistente transition-transform duration-200 hover:scale-105 active:scale-95
             motion-reduce:transition-none"
    >
      <!-- Antena: lo que lo convierte en ayudante y no en una pelota. Parpadea al pensar. -->
      <line x1="32" y1="7" x2="32" y2="15" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
      <circle cx="32" cy="5.5" r="3.2" fill="currentColor"
              [class.animate-pulse]="animo() === 'pensando'"
              [class.motion-reduce:animate-none]="true" />

      <rect x="9" y="15" width="46" height="40" rx="13" fill="currentColor" />
      <!-- Sombra bajo el cuerpo: lo despega del fondo y lo hace parecer que flota. -->
      <ellipse cx="32" cy="62" rx="15" ry="3" fill="currentColor" opacity="0.18" />

      <rect x="15" y="22" width="34" height="22" rx="9" fill="rgba(255,255,255,0.94)" />

      <!-- Los ojos cambian de forma según el ánimo. Es el 90 por ciento de la expresión. -->
      @switch (animo()) {
        @case ('dormido') {
          <path d="M21 33 q4 4 8 0" stroke="#1e1b4b" stroke-width="2.2" fill="none" stroke-linecap="round" />
          <path d="M35 33 q4 4 8 0" stroke="#1e1b4b" stroke-width="2.2" fill="none" stroke-linecap="round" />
        }
        @case ('contento') {
          <path d="M21 34 q4 -6 8 0" stroke="#1e1b4b" stroke-width="2.4" fill="none" stroke-linecap="round" />
          <path d="M35 34 q4 -6 8 0" stroke="#1e1b4b" stroke-width="2.4" fill="none" stroke-linecap="round" />
        }
        @default {
          <circle [attr.cx]="25 + mirada().x" [attr.cy]="33 + mirada().y" r="3.4" fill="#1e1b4b" />
          <circle [attr.cx]="39 + mirada().x" [attr.cy]="33 + mirada().y" r="3.4" fill="#1e1b4b" />
        }
      }

      @if (animo() === 'contento') {
        <path d="M26 48 q6 5 12 0" stroke="rgba(255,255,255,0.95)" stroke-width="2.6" fill="none" stroke-linecap="round" />
      }
      @if (animo() === 'pensando') {
        <rect x="29" y="47" width="6" height="3" rx="1.5" fill="rgba(255,255,255,0.95)"
              class="animate-pulse motion-reduce:animate-none" />
      }
    </svg>
  `,
})
export class PersonajeDelAsistente {
  private readonly plataforma = inject(Plataforma);

  private readonly anfitrion = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly animo = input<Animo>('quieto');
  /**
   * Encogido cuando está en reposo. El tamaño va como ATRIBUTO del SVG para que tenga medida antes de
   * que llegue la hoja de estilos; la clase `personaje-asistente` lo reduce todavía más en el móvil,
   * donde una figura de 58 píxeles se come una esquina entera de una pantalla de 375.
   */
  readonly mini = input(false);

  protected readonly mirada = signal({ x: 0, y: 0 });

  protected readonly tamano = () => (this.mini() ? 34 : 58);

  constructor() {
    if (!this.plataforma.esNavegador) {
      return;
    }
    let pendiente = 0;
    const alMover = (evento: MouseEvent): void => {
      // Como mucho un cálculo por fotograma: sin esto, cada píxel de movimiento del ratón repinta.
      if (pendiente) {
        return;
      }
      pendiente = requestAnimationFrame(() => {
        pendiente = 0;
        this.miraHacia(evento.clientX, evento.clientY);
      });
    };

    // Esto SÍ es un efecto y se queda. No deriva un valor: DA DE ALTA Y DE BAJA un oyente del ratón en
    // la ventana, que es estado del navegador y no una señal. Un `computed` tiene que ser puro y un
    // `linkedSignal` solo sabe recalcular su propio valor; ninguno de los dos puede suscribirse a nada.
    effect(() => {
      // Ni duerme ni sigue el puntero si se ha pedido menos movimiento: es adorno, y molesta.
      const quieto = this.animo() === 'dormido' || this.prefiereMenosMovimiento();
      if (quieto) {
        this.mirada.set({ x: 0, y: 0 });
        window.removeEventListener('mousemove', alMover);
        return;
      }
      window.addEventListener('mousemove', alMover, { passive: true });
    });

    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('mousemove', alMover);
      if (pendiente) {
        cancelAnimationFrame(pendiente);
      }
    });
  }

  private prefiereMenosMovimiento(): boolean {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private miraHacia(x: number, y: number): void {
    const caja = this.anfitrion.nativeElement.getBoundingClientRect();
    if (!caja.width) {
      return;
    }
    const dx = x - (caja.left + caja.width / 2);
    const dy = y - (caja.top + caja.height / 2);
    const distancia = Math.hypot(dx, dy) || 1;
    const fuerza = Math.min(1, distancia / ALCANCE_DE_LA_MIRADA);
    this.mirada.set({
      x: (dx / distancia) * RECORRIDO_PUPILA * fuerza,
      y: (dy / distancia) * RECORRIDO_PUPILA * fuerza,
    });
  }
}
