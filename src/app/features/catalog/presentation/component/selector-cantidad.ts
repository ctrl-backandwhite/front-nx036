import { Component, computed, inject, input, model } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faMinus, faPlus } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';

/**
 * Cuántas unidades, cuando el producto no tiene eje de talla.
 *
 * <p>El mínimo es el pedido mínimo PENDIENTE: lo que falta para el lote, no el lote entero. Si ya hay
 * unidades en la cesta, exigir el mínimo otra vez multiplicaría el pedido.
 *
 * <p>Las existencias se enseñan también aquí, aunque no haya tallas: son las de la variante elegida, y
 * sin ellas quien compra no sabe si el color que ha marcado queda o no.
 */
@Component({
  selector: 'nx-selector-cantidad',
  imports: [FaIconComponent],
  template: `
    <div>
      <div class="text-[12px] opacity-70 mb-1">
        {{ t('product.qty') }}
        @if (minimo() > 1) {
          <span class="opacity-70 ml-1">· {{ t('product.moq') }} {{ minimo() }}</span>
        }
        @if (existencias() !== undefined) {
          <span class="ml-1" [class]="agotado() ? 'text-error' : 'opacity-70'">
            · {{ agotado() ? t('product.out_of_stock') : t('pdp.size.stock') + ': ' + existencias() }}
          </span>
        }
      </div>
      <div class="join">
        <button
          type="button"
          class="btn btn-sm join-item min-h-11 sm:min-h-8"
          [disabled]="cantidad() <= minimo()"
          (click)="cantidad.set(cantidad() - 1)"
          [attr.aria-label]="t('common.prev')"
        >
          <fa-icon [icon]="iconos.menos" />
        </button>
        <span class="btn btn-sm join-item no-animation pointer-events-none min-h-11 sm:min-h-8">
          {{ cantidad() }}
        </span>
        <button
          type="button"
          class="btn btn-sm join-item min-h-11 sm:min-h-8"
          (click)="cantidad.set(cantidad() + 1)"
          [attr.aria-label]="t('common.next')"
        >
          <fa-icon [icon]="iconos.mas" />
        </button>
      </div>
    </div>
  `,
})
export class SelectorCantidad {
  readonly cantidad = model.required<number>();
  readonly minimo = input(1);
  readonly existencias = input<number | undefined>(undefined);

  protected readonly t = inject(TraduccionService).t;
  protected readonly iconos = { menos: faMinus, mas: faPlus };
  protected readonly agotado = computed(() => (this.existencias() ?? 1) <= 0);
}
