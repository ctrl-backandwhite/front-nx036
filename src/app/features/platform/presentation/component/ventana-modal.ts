import { Component, computed, inject, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';

/**
 * Una ventana modal con su fondo oscurecido.
 *
 * <p>PIEZA PROVISIONAL, y consciente: su sitio es el sistema de diseño, que otro equipo está
 * construyendo ahora mismo. Cinco pantallas de este contexto necesitan lo mismo —un panel centrado que
 * se cierra al pulsar fuera o con Escape—, y copiarlo cinco veces habría dejado cinco versiones con
 * cinco comportamientos de teclado distintos. Cuando `@ds` publique el suyo, se borra este fichero y
 * se cambia el import: la forma de usarlo es la misma.
 *
 * <p>Lo que NO es: el diálogo de `@ds/component/dialogo`, que sustituye a `alert`/`confirm`/`prompt` y
 * devuelve una promesa. Ese sí existe y se usa para preguntar; este es para pintar un formulario.
 *
 * <p>Accesibilidad: `role="dialog"` con `aria-modal`, el título asociado por `aria-labelledby`, cierre
 * con Escape y un botón de cerrar con nombre accesible. Sin eso, quien navega con teclado se queda
 * atrapado y quien usa lector de pantalla no sabe que se ha abierto nada.
 */
@Component({
  selector: 'nx-ventana-modal',
  imports: [FaIconComponent],
  template: `
    <!--
      El fondo cierra al pulsarlo, pero el contenido NO: sin stopPropagation, cualquier clic dentro
      del formulario —incluido el de un desplegable— cerraba la ventana y se perdía lo escrito.
      El div del fondo no es un control: el cierre accesible es el botón del aspa y la tecla Escape.
    -->
    <div
      class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      (click)="cierra.emit()"
      (keydown.escape)="cierra.emit()"
      tabindex="-1"
    >
      <div
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="idDelTitulo()"
        [class]="clases()"
        (click)="$event.stopPropagation()"
        (keydown.escape)="cierra.emit()"
      >
        <div class="flex items-start justify-between gap-3 mb-3">
          <h2 [id]="idDelTitulo()" class="text-lg font-medium">{{ titulo() }}</h2>
          <button
            type="button"
            class="btn btn-ghost btn-sm btn-square"
            [attr.aria-label]="t('common.cancel')"
            (click)="cierra.emit()"
          >
            <fa-icon [icon]="iconoAspa" />
          </button>
        </div>
        <ng-content />
      </div>
    </div>
  `,
})
export class VentanaModal {
  readonly titulo = input.required<string>();
  /** Ancho máximo del panel. Las tarjetas de formulario van estrechas; las de detalle, más anchas. */
  readonly ancho = input<'md' | 'lg' | '2xl'>('md');
  readonly cierra = output<void>();

  protected readonly iconoAspa = faXmark;
  protected readonly t = inject(TraduccionService).t;

  /** Un identificador por instancia: dos ventanas con el mismo `id` rompen la asociación del título. */
  protected readonly idDelTitulo = computed(() => `nx-modal-${VentanaModal.siguiente++}`);

  private static siguiente = 1;

  /**
   * MOBILE FIRST: en el móvil ocupa el ancho disponible y se desplaza por dentro si no cabe; el tope de
   * anchura solo aparece a partir de la pantalla pequeña. Escrito al revés —con `max-…`— el panel
   * salía cortado en vertical.
   */
  protected readonly clases = computed(
    () =>
      'card w-full p-5 bg-base-100 max-h-[90vh] overflow-y-auto ' +
      { md: 'sm:max-w-md', lg: 'sm:max-w-lg', '2xl': 'sm:max-w-2xl' }[this.ancho()],
  );
}
