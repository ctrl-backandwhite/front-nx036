import { Component, DOCUMENT, inject, model } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';

export type PestanaDeFicha = 'details' | 'reviews' | 'attributes' | 'packing';

/**
 * El orden de las pestañas sigue al de las SECCIONES, no al revés.
 *
 * <p>«Detalles» va primera desde el 12-sep-2026, cuando su sección se movió encima de las reseñas: es
 * lo que se mira para decidir la compra —medidas, materiales, cómo cae la prenda— y las reseñas se
 * leen después, si se leen. Una barra de pestañas que no respeta el orden de lo que hay debajo hace
 * que pulsar la primera salte hacia abajo y pulsar la cuarta salte hacia arriba.
 *
 * <p>«Recomendado por el vendedor» SALIÓ de la barra el mismo día, al subir su bloque debajo de
 * «Vendido y enviado por NX036». La barra queda pegada arriba y solo indexa lo que hay POR DEBAJO de
 * ella; una pestaña que lleva hacia arriba se sale de la propia barra, que es exactamente el salto
 * que este orden evita. El bloque sigue teniendo su ancla `#tab-recommend`, así que los enlaces
 * directos a esa sección siguen funcionando.
 */
const PESTANAS: readonly PestanaDeFicha[] = ['details', 'reviews', 'attributes', 'packing'];

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
