import { Component, computed, inject, input, output, signal } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { FotoDeResena } from '../../domain/model/catalogo-auxiliar';
import { VisorGaleria } from './visor-galeria';

/**
 * Las fotos que quien compra adjuntó a una reseña: miniaturas cuadradas que se abren en el visor, con
 * paso a la anterior y la siguiente entre las fotos de ESA reseña.
 *
 * <p>Miniaturas con src normal y carga diferida, no NgOptimizedImage con medidas fijas: igual que las
 * del resto de la ficha (ver la galería de detalle). Quien administra ve además un botón para quitar
 * cada foto; la confirmación y la llamada son de quien monta esto.
 */
@Component({
  host: { class: 'block' },
  selector: 'nx-fotos-de-resena',
  imports: [VisorGaleria],
  template: `
    @if (fotos().length > 0) {
      <ul class="flex flex-wrap gap-2 mt-2" role="list">
        @for (foto of fotos(); track foto.id; let i = $index) {
          <li class="relative">
            <button
              type="button"
              class="block size-16 rounded-box overflow-hidden border border-base-300 focus-visible:ring-2 focus-visible:ring-primary"
              [attr.aria-label]="t('reviews.photos.open') + ' ' + (i + 1) + '/' + fotos().length"
              (click)="abierta.set(i)"
            >
              <img
                [src]="foto.url"
                [alt]="etiqueta(i)"
                loading="lazy"
                class="size-full object-cover"
              />
            </button>
            @if (puedeQuitar()) {
              <button
                type="button"
                class="btn btn-circle btn-error size-11 min-h-11 absolute -top-3 -right-3"
                [attr.aria-label]="t('reviews.moderation.remove_photo') + ' ' + (i + 1)"
                (click)="quita.emit(foto.id)"
              >
                ×
              </button>
            }
          </li>
        }
      </ul>
      @if (actual(); as foto) {
        <nx-visor-galeria
          [src]="foto.url"
          [titulo]="etiqueta(abierta()!)"
          [indice]="abierta()!"
          [total]="fotos().length"
          (cierra)="abierta.set(null)"
          (anterior)="paso(-1)"
          (siguiente)="paso(1)"
        />
      }
    }
  `,
})
export class FotosDeResena {
  readonly fotos = input.required<readonly FotoDeResena[]>();
  /** Para el texto alternativo: quién escribió la reseña. */
  readonly autor = input('');
  readonly puedeQuitar = input(false);
  readonly quita = output<string>();

  protected readonly t = inject(TraduccionService).t;
  protected readonly abierta = signal<number | null>(null);
  protected readonly actual = computed(() => {
    const i = this.abierta();
    return i === null ? null : (this.fotos()[i] ?? null);
  });

  protected etiqueta(indice: number): string {
    const de = this.autor() ? ' - ' + this.autor() : '';
    return `${this.t('reviews.photos.alt')} ${indice + 1}/${this.fotos().length}${de}`;
  }

  protected paso(delta: number): void {
    const total = this.fotos().length;
    const i = this.abierta();
    if (i !== null && total > 0) {
      this.abierta.set((i + delta + total) % total);
    }
  }
}
