import { Component, inject } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  IconDefinition,
  faCheckCircle,
  faCircleExclamation,
  faCircleInfo,
  faTriangleExclamation,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { Aviso, AvisosStore, TipoAviso } from './avisos.store';

const ICONOS: Record<TipoAviso, IconDefinition> = {
  success: faCheckCircle,
  error: faCircleExclamation,
  info: faCircleInfo,
  warning: faTriangleExclamation,
};

const CLASES: Record<TipoAviso, string> = {
  success: 'alert-success',
  error: 'alert-error',
  info: 'alert-info',
  warning: 'alert-warning',
};

/**
 * La pila de avisos, abajo a la derecha.
 *
 * <p>Se monta UNA sola vez en el marco de página y escucha la cola. `aria-live="polite"` es lo que hace
 * que un lector de pantalla anuncie la confirmación sin interrumpir lo que se estuviera leyendo.
 */
@Component({
  selector: 'nx-avisos',
  imports: [FaIconComponent],
  template: `
    @if (cola.hayAvisos()) {
      <div
        role="region"
        [attr.aria-label]="t('nav.notifications')"
        aria-live="polite"
        class="toast toast-end z-[100]"
      >
        @for (aviso of cola.avisos(); track aviso.id) {
          <div role="status" [class]="'alert shadow-lg max-w-md ' + clase(aviso)">
            <fa-icon [icon]="icono(aviso)" />
            <div class="flex-1 min-w-0">
              @if (aviso.titulo) {
                <div class="font-medium">{{ aviso.titulo }}</div>
              }
              <div class="text-[13px] leading-snug">{{ aviso.mensaje }}</div>
            </div>
            @if (aviso.accion; as accion) {
              <button
                type="button"
                (click)="ejecuta(aviso)"
                class="btn btn-sm btn-ghost"
              >
                {{ accion.etiqueta }}
              </button>
            }
            <button
              type="button"
              (click)="cola.descarta(aviso.id)"
              class="btn btn-sm btn-ghost btn-square"
              [attr.aria-label]="t('common.close')"
            >
              <fa-icon [icon]="iconoAspa" />
            </button>
          </div>
        }
      </div>
    }
  `,
})
export class Avisos {
  protected readonly cola = inject(AvisosStore);
  protected readonly t = inject(TraduccionService).t;
  protected readonly iconoAspa = faXmark;

  protected icono(aviso: Aviso): IconDefinition {
    return ICONOS[aviso.tipo];
  }

  protected clase(aviso: Aviso): string {
    return CLASES[aviso.tipo];
  }

  /** La acción cierra su propio aviso: quien ya ha pulsado no necesita que se le siga ofreciendo. */
  protected ejecuta(aviso: Aviso): void {
    aviso.accion?.ejecuta();
    this.cola.descarta(aviso.id);
  }
}
