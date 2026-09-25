import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { FormField, applyEach, disabled, form, min } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { CatalogoAdminStore } from '../../../../application/catalogo/state/catalogo-admin.store';
import {
  FichaDeProducto,
  TramoDePrecio,
  etiquetaDeTramo,
} from '../../../../domain/catalogo/model/ficha-de-producto';
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
  imports: [FaIconComponent, FormField],
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
                  <th class="font-medium text-right">
                    {{ t('admin.catalog.detail.tiers.surcharge') }}
                  </th>
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
                      <div class="flex items-center justify-end gap-1.5">
                        <label [for]="'recargo-' + tramo.cantidadMinima" class="sr-only">
                          {{ t('admin.catalog.detail.tiers.surcharge') }}
                        </label>
                        <!--
                          Vacío NO es cero: la casilla en blanco devuelve el tramo al recargo del
                          producto, y un 0 escrito es un recargo de cero. Por eso el marcador de
                          posición dice de qué hereda en vez de enseñar un 0 que nadie ha puesto.
                        -->
                        <input
                          [id]="'recargo-' + tramo.cantidadMinima"
                          type="number"
                          step="0.01"
                          class="input input-xs w-24 text-right font-mono"
                          [title]="t('admin.catalog.detail.tiers.surcharge_hint')"
                          [placeholder]="t('admin.catalog.detail.tiers.surcharge_inherits')"
                          [formField]="formularioDeRecargos[tramo.cantidadMinima]"
                          (blur)="confirmaRecargo(tramo)"
                          (keydown.enter)="$any($event.target).blur()"
                        />
                        <span class="text-[10px] text-ink-400">{{ ficha().divisa }}</span>
                      </div>
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
                        class="input input-xs w-24 text-right font-mono"
                        [title]="ficha().divisa"
                        [formField]="formulario[variante.id]"
                        (blur)="confirma(variante)"
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
  readonly cambiaRecargoDeTramo = output<{ cantidadMinima: number; recargoPct: number | null }>();

  protected readonly t = inject(TraduccionService).t;
  private readonly almacen = inject(CatalogoAdminStore);
  protected readonly iconoBorrar = faTrash;

  /** El precio de la variante más barata: es la que fija el «desde» de la ficha. */
  private readonly referencia = computed(() =>
    precioDeReferencia(this.ficha().variantes, this.ficha().coste),
  );

  /**
   * Un precio editable por variante, derivado de la ficha.
   *
   * <p>Se rehace solo cuando llega otra ficha —al guardar, al cambiar de idioma—, así que la casilla
   * nunca se queda enseñando un precio viejo. Sigue siendo escribible porque es el modelo del
   * formulario.
   */
  private readonly precios = linkedSignal<FichaDeProducto, Record<string, number | null>>({
    source: () => this.ficha(),
    computation: (ficha) =>
      Object.fromEntries(
        ficha.variantes.map((variante) => [
          variante.id,
          variante.precio != null ? Number(variante.precio) : Number(ficha.coste ?? 0),
        ]),
      ),
  });

  /**
   * Ningún precio puede ser negativo.
   *
   * <p>Era un `min="0"` del marcado, que solo limita las flechas del navegador: un −5 tecleado llegaba
   * al guardado. Y aquí un precio en negativo no es un dato raro, es vender por debajo del coste.
   */
  protected readonly formulario = form(this.precios, (ruta) => {
    applyEach(ruta, (precio) => min(precio, 0));
  });

  /**
   * Un recargo editable por tramo, indexado por su cantidad mínima —que es lo que identifica al tramo.
   *
   * <p>Se rehace con cada ficha nueva, igual que los precios de variante, para que la casilla no se
   * quede enseñando el recargo de antes de guardar.
   */
  private readonly recargos = linkedSignal<FichaDeProducto, Record<number, number | null>>({
    source: () => this.ficha(),
    computation: (ficha) =>
      Object.fromEntries(
        ficha.tramos.map((tramo) => [tramo.cantidadMinima, tramo.recargoPct ?? null]),
      ),
  });

  /**
   * Un recargo negativo restaría del precio de venta, que es justo lo contrario de lo que es.
   *
   * <p>El mínimo y el bloqueo mientras se guarda van en el ESQUEMA, no como atributos del marcado:
   * Signal Forms es dueña de `min` y `disabled` y el compilador rechaza ponerlos a mano. Además, un
   * `min="0"` del marcado solo frena las flechas del navegador —un −5 tecleado llegaba al guardado—.
   */
  protected readonly formularioDeRecargos = form(this.recargos, (ruta) => {
    applyEach(ruta, (recargo) => {
      min(recargo, 0);
      disabled(recargo, { when: () => this.ocupado() });
    });
  });

  protected etiqueta(tramo: { cantidadMinima: number; cantidadMaxima?: number | null }): string {
    return etiquetaDeTramo({ ...tramo, precioUnitario: 0, divisa: '' });
  }

  protected nombre(variante: VarianteDeProducto): string {
    return traduceOpciones(variante.titulo ?? '', this.idioma());
  }

  /** El precio que TIENE la variante hoy, no el que se está tecleando: es la base de la comparación. */
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

  /**
   * Manda el recargo al soltar el foco, y SOLO si ha cambiado.
   *
   * <p>Pasar por la casilla sin tocarla no debe guardar nada: cada guardado recalcula el precio del
   * tramo y recarga la ficha, así que un viaje de más se nota.
   */
  protected confirmaRecargo(tramo: TramoDePrecio): void {
    const escrito = this.recargos()[tramo.cantidadMinima];
    // Una casilla vacía llega como null; un número inválido también. Las dos cosas son «sin recargo
    // propio», que es un valor legítimo y hay que poder guardar.
    const recargoPct = escrito === null || !Number.isFinite(escrito) ? null : escrito;
    if (this.formularioDeRecargos[tramo.cantidadMinima]().invalid()) {
      return;
    }
    if (recargoPct === (tramo.recargoPct ?? null)) {
      return;
    }
    this.cambiaRecargoDeTramo.emit({ cantidadMinima: tramo.cantidadMinima, recargoPct });
  }

  protected confirma(variante: VarianteDeProducto): void {
    const precio = this.precios()[variante.id];
    if (precio === null || !Number.isFinite(precio) || this.formulario[variante.id]().invalid()) {
      return;
    }
    this.cambiaPrecio.emit({
      id: variante.id,
      precio,
      anterior: this.precio(variante),
    });
  }
}
