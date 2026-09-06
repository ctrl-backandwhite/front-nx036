import { Component, DestroyRef, computed, inject, input, linkedSignal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition, faImage } from '@fortawesome/free-solid-svg-icons';

/**
 * Reintentos ante fallos TRANSITORIOS de carga (por ejemplo latencia o pérdida de paquetes en el borde):
 * antes se saltaba al marcador al primer error y ya no se recuperaba.
 */
const MAX_REINTENTOS = 2;

/**
 * Servicios de imagen de relleno que devuelven una foto con el texto «800 × 800» escrito encima. Se
 * tratan como rotas a propósito: queda más limpio el icono neutro que una imagen con medidas pintadas.
 */
const SERVICIOS_DE_RELLENO =
  /via\.placeholder|placehold\.co|placeimg|dummyimage|placekitten|loremflickr|fakeimg|picsum/i;

/**
 * La imagen de un producto, con red debajo.
 *
 * <p>Pinta la foto cuando se puede y, si falta o se rompe, un icono neutro de la marca en vez del hueco
 * gris del navegador con el nombre del fichero. Toda superficie con imagen de la aplicación pasa por
 * aquí: es lo que impide que un enlace roto se vea distinto en cada pantalla.
 */
@Component({
  selector: 'nx-imagen-segura',
  imports: [FaIconComponent],
  template: `
    @if (rota()) {
      <div [class]="clasesDelMarcador()" role="img" [attr.aria-label]="alt()">
        <fa-icon [icon]="icono()" class="text-2xl" />
      </div>
    } @else {
      <img
        [src]="direccionFinal()"
        [alt]="alt()"
        loading="lazy"
        referrerpolicy="no-referrer"
        [class]="clase()"
        (error)="alFallar()"
      />
    }
  `,
})
export class ImagenSegura {
  readonly src = input<string | null | undefined>(undefined);
  readonly alt = input.required<string>();
  readonly clase = input('');
  readonly claseMarcador = input('');
  readonly icono = input<IconDefinition>(faImage);

  private readonly destruccion = inject(DestroyRef);

  /**
   * `linkedSignal` y no un `effect`: al cambiar la dirección el estado de fallo se REINICIA solo. Las
   * listas reciclan el componente al desplazarse, y sin ese reinicio la foto siguiente heredaría el
   * fallo de la anterior y nacería ya rota.
   */
  private readonly fallida = linkedSignal<string | null | undefined, boolean>({
    source: () => this.src(),
    computation: () => false,
  });
  private readonly intento = linkedSignal<string | null | undefined, number>({
    source: () => this.src(),
    computation: () => 0,
  });

  private temporizador: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    this.destruccion.onDestroy(() => clearTimeout(this.temporizador));
  }

  /** El marcador cae a la clase de la imagen cuando no se le da una propia. */
  protected readonly clasesDelMarcador = computed(
    () =>
      `flex items-center justify-center bg-ink-50 text-ink-300 ${this.claseMarcador() || this.clase()}`,
  );

  protected readonly rota = computed(() => {
    const direccion = this.src();
    return !direccion || this.fallida() || SERVICIOS_DE_RELLENO.test(direccion);
  });

  /**
   * En los reintentos se añade un parámetro que rompe la caché: sin él el navegador reutilizaría la
   * respuesta fallida y el segundo intento sería idéntico al primero.
   */
  protected readonly direccionFinal = computed(() => {
    const direccion = this.src() ?? '';
    const intento = this.intento();
    if (intento === 0) {
      return direccion;
    }
    return `${direccion}${direccion.includes('?') ? '&' : '?'}nxr=${intento}`;
  });

  protected alFallar(): void {
    const intento = this.intento();
    if (intento >= MAX_REINTENTOS) {
      this.fallida.set(true);
      return;
    }
    const siguiente = intento + 1;
    // Espera creciente: si el borde está saturado, insistir de inmediato solo añade otra petición al montón.
    this.temporizador = setTimeout(() => this.intento.set(siguiente), 500 * siguiente);
  }
}
