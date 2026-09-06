import { Component, inject, input } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { LineaDePedido } from '../../domain/model/pedido';

/**
 * Las imágenes de relleno que dejaron los datos de demostración.
 *
 * <p>Se descartan a propósito: enseñar el marcador de un servicio externo en la ficha de una compra real
 * parece un producto que ya no existe. En su lugar va el hueco gris, que no promete nada.
 */
const IMAGEN_DE_RELLENO = /via\.placeholder|placehold\.co|dummyimage|fakeimg|picsum/i;

/**
 * Lo que se compró.
 *
 * <p>El unitario y la cantidad se enseñan por separado y NO se multiplican: el importe de la línea se
 * calcula en dólares y se convierte una sola vez en el servidor, así que unitario × cantidad no tiene
 * por qué dar el total que se ve a la derecha.
 */
@Component({
  selector: 'nx-productos-del-pedido',
  template: `
    <section class="card p-5">
      <h3>{{ t('order.detail.products') }}</h3>
      <ul class="divide-y divide-ink-100 mt-2">
        @for (linea of lineas(); track linea.id) {
          <li class="py-3 flex items-center gap-3 text-sm">
            @if (conImagen(linea)) {
              <img [src]="linea.imagenUrl" class="w-14 h-14 object-cover rounded" alt="" />
            } @else {
              <div
                class="w-14 h-14 rounded bg-ink-100 flex items-center justify-center text-ink-400 text-xs"
              >
                —
              </div>
            }
            <div class="flex-1 min-w-0">
              <div class="font-medium line-clamp-1">{{ linea.titulo }}</div>
              @if (linea.variante) {
                <div class="text-xs text-ink-500">{{ linea.variante }}</div>
              }
              <div class="text-xs text-ink-500">
                {{ linea.precioUnitarioFormateado || '—' }} /ud · {{ linea.cantidad }}
              </div>
            </div>
            <div class="font-medium">{{ linea.totalDeLineaFormateado || '—' }}</div>
          </li>
        }
      </ul>
    </section>
  `,
})
export class ProductosDelPedido {
  readonly lineas = input.required<readonly LineaDePedido[]>();

  protected readonly t = inject(TraduccionService).t;

  protected conImagen(linea: LineaDePedido): boolean {
    return !!linea.imagenUrl && !IMAGEN_DE_RELLENO.test(linea.imagenUrl);
  }
}
