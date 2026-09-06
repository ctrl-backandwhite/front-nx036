import { Component, inject, output } from '@angular/core';
import { DOCUMENT } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCloudArrowDown, faRotate } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';

/**
 * El hueco elegante para cuando el contenido de una pantalla no se puede pintar —la API no responde en
 * el despliegue remoto, por ejemplo—.
 *
 * <p>No es la pantalla roja de «algo salió mal»: el marco del sitio se mantiene y aquí dentro va un
 * estado vacío con un botón de reintentar. Quien llega a una tienda y ve un error rojo se va; quien ve
 * «vuelve en unos segundos» lo intenta otra vez.
 */
@Component({
  selector: 'nx-contenido-no-disponible',
  imports: [FaIconComponent],
  template: `
    <div class="min-h-[40vh] flex flex-col items-center justify-center text-center gap-3 py-16">
      <span
        class="inline-flex w-14 h-14 items-center justify-center rounded-full bg-base-200 text-ink-400"
      >
        <fa-icon [icon]="iconoNube" class="text-xl" />
      </span>
      <p class="text-ink-500 max-w-sm text-sm">{{ t('errors.500.body') }}</p>
      <button type="button" (click)="reintenta()" class="btn btn-sm btn-outline">
        <fa-icon [icon]="iconoRecargar" /> {{ t('errors.retry') }}
      </button>
    </div>
  `,
})
export class ContenidoNoDisponible {
  /**
   * Quien lo monte puede quedarse con el reintento —volver a pedir solo ese bloque es mucho mejor que
   * recargar la página entera—. Sin nadie escuchando, se recarga.
   */
  readonly reintentado = output<void>();

  protected readonly iconoNube = faCloudArrowDown;
  protected readonly iconoRecargar = faRotate;
  protected readonly t = inject(TraduccionService).t;

  private readonly ventana = inject(DOCUMENT).defaultView;

  protected reintenta(): void {
    this.reintentado.emit();
    this.ventana?.location.reload();
  }
}
