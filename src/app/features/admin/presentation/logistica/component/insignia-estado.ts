import { Component, computed, inject, input } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';

/** El color con el que se lee cada estado de un vistazo. Uno solo, para que no diverjan las pantallas. */
const COLOR: Readonly<Record<string, string>> = {
  PENDING: 'badge-ghost',
  AWAITING_PAYMENT: 'badge-warning',
  PAID: 'badge-info',
  FORWARDED: 'badge-primary',
  SHIPPED: 'badge-warning',
  DELIVERED: 'badge-success',
  CANCELLED: 'badge-error',
  REFUNDED: 'badge-neutral',
};

/**
 * El estado de un pedido, como insignia.
 *
 * <p>PIEZA IMPROVISADA: en el front de React vive en la pantalla del panel de control, que la porta otro
 * equipo. Se hace aquí una versión mínima para no bloquear; cuando aquella exista, esta se retira y las
 * dos pantallas usan la misma —el mapa de colores tiene que ser UNO, o el mismo estado se pinta de dos
 * colores según por dónde se llegue.
 *
 * <p>Sin traducción se enseña el CÓDIGO del estado, no un hueco: un estado nuevo del backend se ve al
 * momento en vez de quedarse en blanco.
 */
@Component({
  selector: 'nx-insignia-estado',
  template: `<span [class]="'badge badge-sm ' + color()">{{ etiqueta() }}</span>`,
})
export class InsigniaEstado {
  readonly estado = input.required<string>();

  private readonly traduccion = inject(TraduccionService);

  protected readonly color = computed(() => COLOR[this.estado()] ?? 'badge-ghost');

  protected readonly etiqueta = computed(() => {
    const clave = `orders.status.${this.estado()}`;
    const texto = this.traduccion.t(clave);
    return texto === clave ? this.estado() : texto;
  });
}
