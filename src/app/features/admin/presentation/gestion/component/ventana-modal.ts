import { Component, inject, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';

/**
 * La ventana sobre el fondo oscurecido que usan los editores de esta área.
 *
 * <p>Se cierra con Escape y pulsando FUERA. El fondo es un BOTÓN de verdad y no un `div` con un
 * manejador: así se puede cerrar también con el teclado y los lectores de pantalla lo anuncian. De paso
 * desaparece la trampa clásica de este patrón —tener que parar la propagación dentro del recuadro para
 * que pulsar un campo no cierre la ventana—, porque el fondo ya no envuelve al contenido.
 *
 * <p>Lleva `role="dialog"` y `aria-modal`: sin ellos, quien navega con lector de pantalla sigue leyendo
 * la página de detrás como si la ventana no existiera.
 *
 * <p>MOBILE FIRST: ocupa el ancho disponible con margen, y el ancho máximo se aplica desde `sm:`.
 */
@Component({
  selector: 'nx-ventana-modal',
  imports: [FaIconComponent],
  template: `
    <div class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <button type="button" class="absolute inset-0 cursor-default"
              [attr.aria-label]="t('common.close')" (click)="cierra.emit()"></button>

      <div class="card relative mt-[6vh] w-full bg-base-100 p-5 space-y-3 max-h-[85vh] overflow-y-auto"
           [class]="ancho()"
           role="dialog"
           aria-modal="true"
           [attr.aria-label]="titulo()">
        <div class="flex items-start justify-between gap-2">
          <h2 class="font-medium">{{ titulo() }}</h2>
          <button type="button" class="btn btn-ghost btn-xs btn-square"
                  [attr.aria-label]="t('common.close')" (click)="cierra.emit()">
            <fa-icon [icon]="iconoAspa" />
          </button>
        </div>
        <ng-content />
      </div>
    </div>
  `,
  host: { '(document:keydown.escape)': 'cierra.emit()' },
})
export class VentanaModal {
  readonly titulo = input.required<string>();
  /** El ancho máximo en escritorio. Se recibe como clase entera porque Tailwind no compone nombres. */
  readonly ancho = input('sm:max-w-md');
  readonly cierra = output<void>();

  protected readonly iconoAspa = faXmark;
  protected readonly t = inject(TraduccionService).t;
}
