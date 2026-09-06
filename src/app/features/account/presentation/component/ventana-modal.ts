import {
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  inject,
  input,
  output,
} from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { Plataforma } from '@core/platform/plataforma';

/**
 * Una ventana emergente.
 *
 * <p>PIEZA PROVISIONAL: su sitio es el sistema de diseño, que otro equipo está escribiendo ahora mismo.
 * Se hace aquí, mínima, para no bloquear el porte del perfil, y se sustituirá por la del sistema en
 * cuanto exista. Queda anotado en el informe del porte.
 *
 * <p>Se MUEVE al final del documento al aparecer. Es lo que en el original hacía un portal de React, y
 * no es un capricho: dentro de un ancestro con «transform» —la transición de página, por ejemplo— un
 * elemento fijo deja de posicionarse respecto a la ventana y acaba descolocado o tapado por el pie.
 *
 * <p>Mobile first: ocupa el ancho con un margen de 1 rem y crece hasta un máximo en pantalla grande; el
 * cuerpo se desplaza solo si no cabe, para que un formulario largo siga siendo utilizable en el móvil.
 *
 * <p>Se cierra de tres maneras: el botón, la tecla de escape y el fondo. El fondo es un BOTÓN de verdad
 * y no un contenedor con un gesto encima, para que exista también para quien navega con el teclado.
 */
@Component({
  selector: 'nx-ventana-modal',
  imports: [FaIconComponent],
  host: { class: 'contents', '(keydown.escape)': 'cierra.emit()' },
  template: `
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        class="absolute inset-0 bg-black/40"
        [attr.aria-label]="t('common.close')"
        (click)="cierra.emit()"
      ></button>

      <div
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="titulo()"
        [class]="'relative bg-base-100 rounded-lg shadow-xl w-full p-5 max-h-[90vh] overflow-y-auto ' + ancho()"
      >
        <div class="flex items-center justify-between mb-3 gap-2">
          <h3 class="flex items-center gap-2 text-base font-semibold">
            <ng-content select="[icono]" />
            {{ titulo() }}
          </h3>
          <button
            type="button"
            class="btn btn-ghost btn-xs btn-square"
            [attr.aria-label]="t('common.close')"
            (click)="cierra.emit()"
          >
            <fa-icon [icon]="iconoCerrar" />
          </button>
        </div>
        <ng-content />
      </div>
    </div>
  `,
})
export class VentanaModal implements OnDestroy {
  readonly titulo = input.required<string>();
  /** El ancho máximo en pantalla grande. En el móvil siempre ocupa el ancho disponible. */
  readonly ancho = input('max-w-lg');
  readonly cierra = output<void>();

  protected readonly t = inject(TraduccionService).t;
  protected readonly iconoCerrar = faXmark;

  private readonly anfitrion = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly documento = inject(Plataforma).documentoSiLoHay;

  constructor() {
    // Se mueve DESPUÉS del primer pintado, no en el constructor: hasta que la vista que la contiene no
    // ha terminado de montarse, el elemento anfitrión todavía no está colocado en el documento, y
    // moverlo antes lo devolvería a su sitio original en cuanto Angular lo insertara.
    afterNextRender(() => this.documento?.body.appendChild(this.anfitrion.nativeElement));
  }

  ngOnDestroy(): void {
    // Al haberlo movido, Angular ya no lo tiene donde lo dejó: hay que retirarlo a mano o la ventana se
    // quedaría pintada para siempre encima de la aplicación.
    this.anfitrion.nativeElement.remove();
  }
}
