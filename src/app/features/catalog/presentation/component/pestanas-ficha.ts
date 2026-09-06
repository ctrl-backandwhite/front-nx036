import { Component, DOCUMENT, inject, model } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';

export type PestanaDeFicha = 'reviews' | 'attributes' | 'packing' | 'details' | 'recommend';

const PESTANAS: readonly PestanaDeFicha[] = [
  'reviews',
  'attributes',
  'packing',
  'details',
  'recommend',
];

/**
 * Las pestañas que acompañan al desplazamiento por la ficha.
 *
 * <p>Se quedan pegadas arriba y llevan a su sección. No son pestañas que oculten contenido: todas las
 * secciones están siempre en la página, porque es lo que permite buscar dentro con el navegador y lo
 * que hace que un enlace a una sección concreta funcione.
 *
 * <p>La barra se DESPLAZA en el móvil: cinco rótulos no caben en una pantalla estrecha y, encogidos,
 * dejaban de leerse.
 */
@Component({
  selector: 'nx-pestanas-ficha',
  template: `
    <div
      role="tablist"
      class="tabs tabs-bordered sticky top-14 z-20 bg-base-100 mt-8 overflow-x-auto"
    >
      @for (pestana of pestanas; track pestana) {
        <button
          type="button"
          role="tab"
          [attr.aria-selected]="activa() === pestana"
          (click)="va(pestana)"
          class="tab"
          [class.tab-active]="activa() === pestana"
        >
          {{ t('pdp.tab.' + pestana) }}
        </button>
      }
    </div>
  `,
})
export class PestanasFicha {
  readonly activa = model<PestanaDeFicha>('reviews');

  private readonly documento = inject(DOCUMENT);
  protected readonly t = inject(TraduccionService).t;
  protected readonly pestanas = PESTANAS;

  protected va(pestana: PestanaDeFicha): void {
    this.activa.set(pestana);
    this.documento
      .getElementById(`tab-${pestana}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
