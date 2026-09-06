import { Component, computed, effect, inject, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCircleCheck, faTrash } from '@fortawesome/free-solid-svg-icons';
import { colorToCss } from '@shared/i18n/color-terms';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PreferenciasService } from '@core/preferences/preferencias';
import { EjeDeVariante } from '../../domain/model/producto';
import { etiquetaDeValor } from '../../domain/model/seleccion-de-variante';

/** Lo que se elige: la etiqueta (que es la clave) y la foto de ese color, si la tiene. */
export interface ColorElegido {
  readonly etiqueta: string;
  readonly foto?: string;
}

/**
 * Los recuadros de color (o del eje principal que haya: modelo, enchufe…).
 *
 * <p>El estado seleccionado va MUY marcado —recuadro y anillo del color de la variante, escala, sombra
 * y un visto en la esquina— porque con una diferencia sutil no se distinguía cuál estaba elegido, y de
 * ahí salían pedidos del color equivocado. Si el color no se reconoce, se cae al color primario.
 */
@Component({
  selector: 'nx-selector-color',
  imports: [FaIconComponent],
  template: `
    @if (valores().length > 0) {
      <div>
        <div class="text-[12px] opacity-70 mb-1">
          {{ nombreDelEje() }}: <strong>{{ elegido() ?? '—' }}</strong>
        </div>
        <div class="flex flex-wrap gap-2">
          @for (valor of valores(); track valor.id) {
            <div class="relative group">
              <button
                type="button"
                (click)="elige.emit({ etiqueta: etiqueta(valor), foto: valor.imagen })"
                [title]="etiqueta(valor)"
                [attr.aria-pressed]="elegido() === etiqueta(valor)"
                [style.border-color]="borde(valor)"
                class="w-12 h-12 rounded-lg border-2 overflow-hidden relative transition-all block"
                [class]="
                  elegido() === etiqueta(valor)
                    ? 'ring-2 ring-offset-2 scale-110 shadow-lg'
                    : 'opacity-80 hover:opacity-100 hover:scale-105'
                "
              >
                @if (valor.imagen) {
                  <img
                    [src]="valor.imagen"
                    [alt]="etiqueta(valor)"
                    loading="lazy"
                    class="w-full h-full object-contain bg-base-100"
                  />
                } @else {
                  <span class="flex items-center justify-center w-full h-full text-[10px] px-1 text-center">
                    {{ etiqueta(valor) }}
                  </span>
                }
              </button>
              @if (elegido() === etiqueta(valor)) {
                <span
                  class="pointer-events-none absolute -top-1.5 -right-1.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-neutral text-neutral-content shadow ring-2 ring-base-100"
                >
                  <fa-icon [icon]="iconos.visto" class="text-[13px]" />
                </span>
              }
              @if (puedeEditar()) {
                <button
                  type="button"
                  (click)="borra.emit(valor.id); $event.stopPropagation()"
                  [title]="t('admin.catalog.variant.delete')"
                  class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-error text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow z-10"
                >
                  <fa-icon [icon]="iconos.papelera" />
                </button>
              }
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class SelectorColor {
  readonly eje = input.required<EjeDeVariante>();
  readonly elegido = input<string | null>(null);
  readonly puedeEditar = input(false);

  readonly elige = output<ColorElegido>();
  readonly borra = output<string>();

  private readonly preferencias = inject(PreferenciasService);
  protected readonly t = inject(TraduccionService).t;
  protected readonly iconos = { visto: faCircleCheck, papelera: faTrash };

  protected readonly valores = computed(() => this.eje().valores);

  protected readonly nombreDelEje = computed(() => {
    const eje = this.eje();
    return (eje.nombre?.trim() || eje.nombreZh?.trim()) ?? this.t('pdp.color');
  });

  protected etiqueta(valor: EjeDeVariante['valores'][number]): string {
    return etiquetaDeValor(valor, this.preferencias.idioma());
  }

  protected borde(valor: EjeDeVariante['valores'][number]): string {
    return colorToCss(this.etiqueta(valor)) ?? '#d1d5db';
  }

  constructor() {
    // El PRIMER color queda elegido al abrir la ficha, para que el stock y el precio sean los de una
    // variante real desde el principio. Se elige SIN cambiar la foto: al entrar se enseña la imagen
    // principal del producto, y solo cambia cuando quien mira pulsa un recuadro.
    effect(() => {
      const valores = this.valores();
      if (this.elegido() == null && valores.length > 0) {
        this.elige.emit({ etiqueta: this.etiqueta(valores[0]) });
      }
    });
  }
}
