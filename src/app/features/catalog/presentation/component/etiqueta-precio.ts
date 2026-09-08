import { Component, computed, input } from '@angular/core';
import { PrecioParaMostrar, estaRebajado } from '../../domain/model/producto';

/** Los tres tamaños en los que aparece el precio: tarjeta, ficha rápida y encabezado de la ficha. */
const TAMANOS = {
  sm: { ahora: 'text-sm font-bold', antes: 'text-[11px]', distintivo: 'text-[10px] px-1 py-px' },
  md: { ahora: 'text-lg font-semibold', antes: 'text-xs', distintivo: 'text-[11px] px-1.5 py-0.5' },
  lg: { ahora: 'text-3xl font-bold', antes: 'text-sm', distintivo: 'text-xs px-2 py-0.5' },
} as const;

export type TamanoDePrecio = keyof typeof TAMANOS;

/**
 * El precio de un producto, con o sin rebaja.
 *
 * <p>Existe para que el catálogo, la ficha y la vista rápida enseñen la rebaja IGUAL. Cuando cada
 * pantalla componía su precio a mano, bastaba con que una olvidara el tachado para que el mismo
 * producto pareciera costar dos cosas distintas según dónde se mirase.
 *
 * <p>Los importes llegan YA formateados por el backend («14,06 €»): aquí no se calcula ni se convierte
 * nada, que es la norma de precios del proyecto.
 */
@Component({
  selector: 'nx-etiqueta-precio',
  template: `
    @if (texto(); as importe) {
      @if (rebajado()) {
        <span
          class="inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5"
          [class]="clase()"
          [title]="precio().promocion || ''"
        >
          <!--
            El precio a pagar va en el color normal del texto y el ANTERIOR en rojo tachado: así el rojo
            señala lo que se deja de pagar, no lo que se paga (decisión del usuario, 8-ago-2026).
          -->
          <span [class]="tamanos().ahora" class="text-ink-900 dark:text-ink-100">{{ importe }}</span>
          <s [class]="tamanos().antes" class="text-rose-600 dark:text-rose-400">
            {{ precio().anteriorFormateado }}
          </s>
          <span
            [class]="tamanos().distintivo"
            class="rounded bg-rose-600 font-semibold text-white dark:bg-rose-500"
          >
            −{{ precio().descuentoPorcentaje }}%
          </span>
        </span>
      } @else {
        <!--
          «text-base-content» es el color de texto DEL TEMA, así que contrasta con su fondo por
          definición. Con un gris fijo el precio quedaba lavado en claro y, en un móvil a plena luz, el
          precio es justo lo que hay que poder leer de un vistazo.
        -->
        <!--
          Las dos partes van en UNA sola asociación, y esa es la corrección.

          DEFECTO QUE CIERRA ESTO: aquí había DOS [class] en el mismo elemento —el tamaño y la clase que
          viene de fuera—, y la segunda pisaba a la primera. Como el tamaño es quien trae el grosor
          (text-sm font-bold, text-3xl font-bold…), el precio SIN REBAJA se pintaba con el grosor normal
          en toda la tienda: en la portada, en el catálogo y en la ficha. El precio rebajado sí salía
          bien, porque en esa rama las dos clases están en elementos distintos, y por eso el fallo se
          camuflaba: convivían en la misma pantalla un precio en negrita y otro no.
        -->
        <span
          [class]="tamanos().ahora + ' ' + clase()"
          class="text-base-content"
        >{{ importe }}</span>
      }
    }
  `,
})
export class EtiquetaPrecio {
  readonly precio = input.required<PrecioParaMostrar>();
  readonly tamano = input<TamanoDePrecio>('md');
  readonly clase = input('');

  protected readonly tamanos = computed(() => TAMANOS[this.tamano()]);
  protected readonly rebajado = computed(() => estaRebajado(this.precio()));

  /**
   * El importe a pintar: manda la cadena del backend. Sin ella se cae a un guión, porque componer un
   * precio en el navegador sería inventárselo — el coste del proveedor ya no viaja fuera del panel.
   */
  protected readonly texto = computed(() => this.precio().formateado ?? '');
}
