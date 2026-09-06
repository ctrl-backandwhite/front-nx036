import { Component, computed, inject, input } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';

/**
 * El estado de un pedido, con su color.
 *
 * <p>La correspondencia entre estado y color está AQUÍ y en un solo sitio: repartida por las pantallas,
 * el mismo estado acababa en verde en una tabla y en gris en otra, y quien administra dejaba de fiarse
 * del color.
 *
 * <p>Si el estado no tiene traducción se enseña el código crudo. Es feo, pero un estado nuevo del
 * backend tiene que verse: en blanco, la fila parecería no tener estado.
 */
const COLORES: Readonly<Record<string, string>> = {
  PENDING: 'badge-ghost',
  AWAITING_PAYMENT: 'badge-warning',
  PAID: 'badge-info',
  FORWARDED: 'badge-primary',
  SHIPPED: 'badge-warning',
  DELIVERED: 'badge-success',
  CANCELLED: 'badge-error',
  REFUNDED: 'badge-neutral',
};

@Component({
  selector: 'nx-insignia-de-estado',
  template: `<span class="badge badge-sm" [class]="color()">{{ rotulo() }}</span>`,
})
export class InsigniaDeEstado {
  readonly estado = input.required<string>();

  private readonly traduccion = inject(TraduccionService);

  protected readonly color = computed(() => COLORES[this.estado()] ?? 'badge-ghost');

  protected readonly rotulo = computed(() => {
    const clave = `orders.status.${this.estado()}`;
    const texto = this.traduccion.t(clave);
    return texto === clave ? this.estado() : texto;
  });
}
