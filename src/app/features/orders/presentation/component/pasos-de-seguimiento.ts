import { Component, inject, input } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faLocationDot } from '@fortawesome/free-solid-svg-icons';
import { HitoDeSeguimiento, claveDeRespaldoDelHito } from '../../domain/model/seguimiento';
import { nombreDeUbicacion } from './ubicacion';

/**
 * Los pasos del envío, del más reciente al más antiguo.
 *
 * <p>Los recibe YA ordenados y sin repetidos: quién decide qué dos avisos son el mismo hecho es el
 * dominio, no esta plantilla.
 */
@Component({
  // Nace en BLOQUE: un elemento personalizado es `inline` por defecto y un inline ignora
  // los márgenes verticales, así que bajo un contenedor con `space-y` se pega al de al lado.
  host: { class: 'block' },
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
          <div class="text-sm font-medium">{{ textoDe(hito) }}</div>
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
  private readonly t = inject(TraduccionService).t;

  /**
   * Lo que se lee en el paso. Un hito que llega sin descripción no puede quedar como una viñeta vacía:
   * se cuenta con la fase y, si tampoco la trae, con el estado; y si ni eso tiene traducción, con el
   * estado tal cual.
   */
  protected textoDe(hito: HitoDeSeguimiento): string {
    if (hito.descripcion?.trim()) {
      return hito.descripcion;
    }
    const clave = claveDeRespaldoDelHito(hito);
    const traducido = this.t(clave);
    return traducido !== clave ? traducido : hito.estado;
  }

  protected ubicacion(valor?: string): string {
    return nombreDeUbicacion(valor);
  }

  protected fechaYHora(valor: string): string {
    return new Date(valor).toLocaleString();
  }
}
