import { Component, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faLocationDot } from '@fortawesome/free-solid-svg-icons';
import { HitoDeSeguimiento } from '../../domain/model/seguimiento';
import { nombreDeUbicacion } from './ubicacion';

/**
 * Los pasos del envío, del más reciente al más antiguo.
 *
 * <p>Los recibe YA ordenados y sin repetidos: quién decide qué dos avisos son el mismo hecho es el
 * dominio, no esta plantilla.
 */
@Component({
  selector: 'nx-pasos-de-seguimiento',
  imports: [FaIconComponent],
  template: `
    <ol class="relative border-s border-base-300 ms-2 space-y-4">
      @for (hito of hitos(); track $index) {
        <li class="ms-4">
          <span
            class="absolute -start-[7px] mt-1 w-3.5 h-3.5 rounded-full border-2 border-base-100"
            [class.bg-primary]="$first"
            [class.bg-base-300]="!$first"
          ></span>
          <div class="text-sm font-medium">{{ hito.descripcion }}</div>
          <div class="text-xs text-ink-500 flex flex-wrap gap-x-2">
            @if (hito.ubicacion) {
              <span>
                <fa-icon [icon]="iconoUbicacion" class="me-1" />{{ ubicacion(hito.ubicacion) }}
              </span>
            }
            @if (hito.ocurridoEl) {
              <span>{{ fechaYHora(hito.ocurridoEl) }}</span>
            }
          </div>
        </li>
      }
    </ol>
  `,
})
export class PasosDeSeguimiento {
  readonly hitos = input.required<readonly HitoDeSeguimiento[]>();

  protected readonly iconoUbicacion = faLocationDot;

  protected ubicacion(valor?: string): string {
    return nombreDeUbicacion(valor);
  }

  protected fechaYHora(valor: string): string {
    return new Date(valor).toLocaleString();
  }
}
