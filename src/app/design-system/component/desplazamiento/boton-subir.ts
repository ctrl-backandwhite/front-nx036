import { Component, inject, input, signal } from '@angular/core';
import { DOCUMENT } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowUp } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';

/**
 * El botón flotante de «volver arriba».
 *
 * <p>Aparece cuando ya se ha bajado un buen trecho, que es cuando sirve de algo: con el catálogo de
 * desplazamiento infinito, volver al principio a mano es interminable.
 */
@Component({
  selector: 'nx-boton-subir',
  imports: [FaIconComponent],
  template: `
    @if (visible()) {
      <button
        type="button"
        (click)="sube()"
        [attr.aria-label]="t('catalog.back_to_top')"
        [title]="t('catalog.back_to_top')"
        class="fixed bottom-6 right-6 z-40 btn btn-primary btn-circle shadow-pastel-lg"
      >
        <fa-icon [icon]="iconoArriba" />
      </button>
    }
  `,
  host: { '(window:scroll)': 'revisa()' },
})
export class BotonSubir {
  /** Píxeles bajados a partir de los cuales el botón tiene sentido. */
  readonly umbral = input(600);

  protected readonly iconoArriba = faArrowUp;
  protected readonly t = inject(TraduccionService).t;
  protected readonly visible = signal(false);

  private readonly ventana = inject(DOCUMENT).defaultView;

  protected revisa(): void {
    this.visible.set((this.ventana?.scrollY ?? 0) > this.umbral());
  }

  protected sube(): void {
    this.ventana?.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
