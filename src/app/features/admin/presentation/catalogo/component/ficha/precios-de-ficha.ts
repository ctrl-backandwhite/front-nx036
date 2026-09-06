import { Component, computed, inject, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { CatalogoAdminStore } from '../../../../application/catalogo/state/catalogo-admin.store';
import { FichaDeProducto, etiquetaDeTramo } from '../../../../domain/catalogo/model/ficha-de-producto';
import { traduceOpciones } from '../../../../domain/catalogo/model/glosario-de-variantes';
import {
  VarianteDeProducto,
  desviacionDePrecio,
  precioDeReferencia,
} from '../../../../domain/catalogo/model/variante-de-producto';

/**
 * La pestaña de precios: los tramos por cantidad y el precio de cada variante.
 *
 * <p>El precio que se edita aquí es el CRUDO —en yuanes y sin margen—, que es como lo guarda el
 * backend. Al lado se enseña el equivalente en la moneda activa, solo como referencia.
 *
 * <p>La desviación se mide contra la variante MÁS BARATA, que es la que fija el precio de portada: con
 * el coste base como referencia, una ficha de una sola variante no leía 0 % y no había forma de saber
 * si eso era un problema.
 */
@Component({
  selector: 'nx-precios-de-ficha',
  imports: [FaIconComponent],
  template: `
    <div class="space-y-4">
      @if (ficha().tramos.length > 0) {
        <div class="card overflow-hidden p-4 space-y-2">
          <h3 class="text-[13px] font-semibold text-ink-700">
            {{ t('admin.catalog.detail.tiers.title') }}
          </h3>
          <div class="overflow-x-auto">
            <table class="table table-sm">
              <thead class="text-ink-500 text-left text-[12px]">
                <tr>
                  <th class="font-medium">{{ t('admin.catalog.detail.tiers.qty') }}</th>
                  <th class="font-medium text-right">{{ t('admin.catalog.detail.tiers.unit') }}</th>
                  <th class="w-10"></th>
                </tr>
              </thead>
              <tbody>
                @for (tramo of ficha().tramos; track tramo.cantidadMinima) {
                  <tr class="border-t border-ink-100">
                    <td>{{ etiqueta(tramo) }}</td>
                    <td class="text-right font-mono">
                      {{ tramo.precioUnitario.toFixed(2) }} {{ tramo.divisa }}
                    </td>
                    <td class="text-right">
                      <button
                        type="button"
                        class="btn btn-outline btn-square btn-xs hover:border-red-300 hover:text-red-700"
                        [disabled]="ocupado()"
                        [title]="t('admin.catalog.detail.tiers.delete')"
                        [attr.aria-label]="t('admin.catalog.detail.tiers.delete')"
                        (click)="borraTramo.emit(tramo.cantidadMinima)"
                      >
                        <fa-icon [icon]="iconoBorrar" />
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <ng-content />

      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="table table-zebra table-sm">
            <thead class="bg-ink-50 text-ink-500 text-left text-[12px]">
              <tr>
                <th class="px-3 py-2 font-medium">{{ t('admin.catalog.detail.inv.sku') }}</th>
                <th class="px-3 py-2 font-medium">{{ t('admin.catalog.detail.inv.variant') }}</th>
                <th class="px-3 py-2 font-medium text-right">{{ t('admin.catalog.col.price') }}</th>
                <th class="px-3 py-2 font-medium text-right">
                  {{ t('admin.catalog.detail.pricing.delta') }}
                </th>
              </tr>
            </thead>
            <tbody>
              @for (variante of ficha().variantes; track variante.id) {
                <tr class="border-t border-ink-100">
                  <td class="px-3 py-2 font-mono text-[11px]">{{ variante.sku ?? '—' }}</td>
                  <td class="px-3 py-2">{{ nombre(variante) }}</td>
                  <td class="px-3 py-2 text-right">
                    <div class="flex items-center justify-end gap-1.5">
                      <label [for]="'precio-' + variante.id" class="sr-only">
                        {{ t('admin.catalog.col.price') }}
                      </label>
                      <input
                        [id]="'precio-' + variante.id"
                        type="number"
                        step="0.01"
                        min="0"
                        class="input input-xs w-24 text-right font-mono"
                        [title]="ficha().divisa"
                        [value]="precio(variante)"
                        (blur)="confirma(variante, $any($event.target).value)"
                        (keydown.enter)="$any($event.target).blur()"
                      />
                      <span class="text-[10px] text-ink-400">{{ ficha().divisa }}</span>
                    </div>
                    <div class="text-[10px] text-ink-400 mt-0.5">{{ equivalente(variante) }}</div>
                  </td>
                  <td
                    class="px-3 py-2 text-right text-[12px]"
                    [class.text-amber-600]="desviacion(variante) > 0"
                    [class.text-emerald-600]="desviacion(variante) < 0"
                    [class.text-ink-500]="desviacion(variante) === 0"
                  >
                    {{ textoDeDesviacion(variante) }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class PreciosDeFicha {
  readonly ficha = input.required<FichaDeProducto>();
  readonly idioma = input('es');
  readonly ocupado = input(false);

  readonly borraTramo = output<number>();
  readonly cambiaPrecio = output<{ id: string; precio: number; anterior: number }>();

  protected readonly t = inject(TraduccionService).t;
  private readonly almacen = inject(CatalogoAdminStore);
  protected readonly iconoBorrar = faTrash;

  /** El precio de la variante más barata: es la que fija el «desde» de la ficha. */
  private readonly referencia = computed(() =>
    precioDeReferencia(this.ficha().variantes, this.ficha().coste),
  );

  protected etiqueta(tramo: { cantidadMinima: number; cantidadMaxima?: number | null }): string {
    return etiquetaDeTramo({ ...tramo, precioUnitario: 0, divisa: '' });
  }

  protected nombre(variante: VarianteDeProducto): string {
    return traduceOpciones(variante.titulo ?? '', this.idioma());
  }

  protected precio(variante: VarianteDeProducto): number {
    return variante.precio != null ? Number(variante.precio) : Number(this.ficha().coste ?? 0);
  }

  protected equivalente(variante: VarianteDeProducto): string {
    return `≈ ${this.almacen.formatea(this.precio(variante), this.ficha().divisa)}`;
  }

  protected desviacion(variante: VarianteDeProducto): number {
    return desviacionDePrecio(this.precio(variante), this.referencia());
  }

  protected textoDeDesviacion(variante: VarianteDeProducto): string {
    const valor = this.desviacion(variante);
    return valor === 0 ? '—' : `${valor > 0 ? '+' : ''}${valor.toFixed(1)}%`;
  }

  protected confirma(variante: VarianteDeProducto, valor: string): void {
    const precio = Number(valor);
    if (valor.trim() === '' || !Number.isFinite(precio)) {
      return;
    }
    this.cambiaPrecio.emit({
      id: variante.id,
      precio,
      anterior: this.precio(variante),
    });
  }
}
