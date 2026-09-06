import { Component, inject, input, output } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisoDeMinimo } from '../acciones-de-linea';

/**
 * El aviso de pedido mínimo, con su salida.
 *
 * <p>Va con `role="alert"` porque aparece como consecuencia de lo que se acaba de pulsar: quien navega con
 * lector de pantalla tiene que enterarse de que su acción no se ha aplicado, y por qué.
 *
 * <p>Cuando el aviso trae producto se ofrece hacerlo con el producto entero. Sin esa salida, un producto
 * repartido en dos líneas quedaría atrapado: cada una dejaría a la otra por debajo del mínimo.
 */
@Component({
  selector: 'nx-aviso-de-minimo',
  template: `
    <div
      role="alert"
      class="flex items-start gap-2 rounded border border-warning/40 bg-warning/10 p-3 text-[13px]"
    >
      <span class="flex-1">{{ aviso().texto }}</span>
      @if (aviso().productId) {
        <button type="button" class="btn btn-xs" (click)="sacaElProducto.emit()">
          {{ aviso().modo === 'apartar' ? t('cart.save_for_later') : t('cart.remove') }}
        </button>
      }
      <button
        type="button"
        class="shrink-0 opacity-60 hover:opacity-100"
        [attr.aria-label]="t('common.close')"
        (click)="descarta.emit()"
      >
        ×
      </button>
    </div>
  `,
})
export class AvisoDeMinimoComponent {
  readonly aviso = input.required<AvisoDeMinimo>();
  readonly sacaElProducto = output<void>();
  readonly descarta = output<void>();

  protected readonly t = inject(TraduccionService).t;
}
