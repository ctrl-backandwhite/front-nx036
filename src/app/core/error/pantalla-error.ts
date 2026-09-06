import { Component, inject } from '@angular/core';
import { DOCUMENT } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faHouse, faRotate, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { ManejadorErrores } from './manejador-errores';

/**
 * La pantalla que sustituye a la página cuando algo revienta de verdad.
 *
 * <p>Sin ella, un fallo al pintar deja la página EN BLANCO: ni marca, ni salida, ni pista de qué ha
 * pasado. Aquí hay las dos cosas que hacen falta: una salida —recargar o volver al inicio— y los
 * detalles técnicos, plegados, para quien tenga que diagnosticarlo.
 */
@Component({
  selector: 'nx-pantalla-error',
  imports: [FaIconComponent],
  template: `
    @if (manejador.fallo(); as fallo) {
      <div class="min-h-screen flex items-center justify-center p-6 bg-ink-50">
        <div class="max-w-xl w-full card p-8 text-center">
          <span
            class="inline-flex w-12 h-12 items-center justify-center rounded-full bg-red-100 text-red-600"
          >
            <fa-icon [icon]="iconoAviso" class="text-xl" />
          </span>
          <h1 class="mt-4 text-2xl font-medium">{{ t('errors.500.title') }}</h1>
          <p class="mt-2 text-ink-600">{{ t('errors.500.body') }}</p>
          <div class="mt-5 flex flex-wrap gap-2 justify-center">
            <button type="button" (click)="recarga()" class="btn btn-primary">
              <fa-icon [icon]="iconoRecargar" /> {{ t('errors.retry') }}
            </button>
            <a href="/" class="btn btn-outline" (click)="manejador.olvida()">
              <fa-icon [icon]="iconoInicio" /> {{ t('errors.home') }}
            </a>
          </div>
          <details class="mt-6 text-left text-[11px] opacity-70">
            <summary class="cursor-pointer">{{ t('errors.500.title') }}</summary>
            <pre
              class="mt-2 p-3 bg-base-200 border border-base-300 rounded overflow-auto text-[11px] whitespace-pre-wrap max-h-80"
              >{{ fallo.mensaje }}

{{ fallo.pila }}</pre
            >
          </details>
        </div>
      </div>
    }
  `,
})
export class PantallaError {
  protected readonly manejador = inject(ManejadorErrores);
  protected readonly t = inject(TraduccionService).t;

  protected readonly iconoAviso = faTriangleExclamation;
  protected readonly iconoRecargar = faRotate;
  protected readonly iconoInicio = faHouse;

  private readonly ventana = inject(DOCUMENT).defaultView;

  protected recarga(): void {
    // Se olvida ANTES de recargar: si la recarga no llega a ocurrir —por ejemplo en una prueba— la
    // pantalla no se queda clavada en el error anterior.
    this.manejador.olvida();
    this.ventana?.location.reload();
  }
}
