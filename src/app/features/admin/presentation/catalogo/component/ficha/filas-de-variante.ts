import { Component, computed, inject, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { FieldTree, FormField } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faImage } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { BorradorDeVariante } from '../../../../domain/catalogo/model/variante-de-producto';
import { EstadoDeCampo, falloDelCampo } from '../../etiquetas';

/**
 * Las celdas editables de una variante: foto, SKU, título, precio, existencias y opciones.
 *
 * <p>Las mismas seis celdas se usan en la edición de UNA fila y en la de TODAS a la vez; la séptima
 * —los botones— la pone quien lo monta con `ng-content`, que es lo único que cambia entre los dos casos.
 *
 * <p>Recibe el CAMPO del formulario de quien la monta y escribe directamente en él: antes publicaba cada
 * tecla hacia arriba y el padre la volvía a mezclar en su propio estado, que es el rodeo que hacía falta
 * cuando no había formulario.
 *
 * <p>El componente ES la fila: se maqueta con la utilidad `table-row`, de modo que el selector cumple la
 * norma —todo componente empieza por `nx-`— sin dejar de comportarse como un `<tr>`.
 *
 * <p>El precio va en yuanes y sin margen: es el valor crudo, que es el que se guarda.
 */
@Component({
  selector: 'nx-filas-de-variante',
  imports: [NgOptimizedImage, FormField, FaIconComponent],
  template: `
    <td class="px-3 py-2">
      <div class="flex items-center gap-1">
        @if (valores().urlImagen) {
          <img
            [ngSrc]="valores().urlImagen"
            width="32"
            height="32"
            alt=""
            class="w-8 h-8 rounded object-cover border border-ink-200 shrink-0"
          />
        } @else {
          <span class="w-8 h-8 rounded border border-dashed border-ink-200 grid place-items-center text-ink-300 shrink-0">
            <fa-icon [icon]="iconoImagen" class="text-[11px]" />
          </span>
        }
        <input
          class="input input-bordered input-xs w-full"
          [placeholder]="t('admin.variants.image_ph')"
          [attr.aria-label]="t('admin.variants.image')"
          [formField]="campos().urlImagen"
        />
      </div>
    </td>
    <td class="px-3 py-2">
      <input
        class="input input-bordered input-xs w-full"
        [attr.aria-label]="t('admin.catalog.detail.inv.sku')"
        [formField]="campos().sku"
      />
      @if (fallo(campos().sku()); as texto) {
        <div class="text-[11px] text-error mt-0.5">{{ texto }}</div>
      }
    </td>
    <td class="px-3 py-2">
      <input
        class="input input-bordered input-xs w-full"
        [placeholder]="t('admin.variants.title_ph')"
        [attr.aria-label]="t('admin.variants.title_ph')"
        [formField]="campos().titulo"
      />
    </td>
    <td class="px-3 py-2">
      <input
        type="number"
        step="0.01"
        class="input input-bordered input-xs w-full text-right"
        placeholder="0.00"
        [attr.aria-label]="t('admin.catalog.col.price')"
        [formField]="campos().precio"
      />
      @if (fallo(campos().precio()); as texto) {
        <div class="text-[11px] text-error mt-0.5">{{ texto }}</div>
      }
    </td>
    <td class="px-3 py-2">
      <input
        type="number"
        class="input input-bordered input-xs w-full text-right"
        placeholder="0"
        [attr.aria-label]="t('admin.catalog.detail.inv.stock')"
        [formField]="campos().existencias"
      />
      @if (fallo(campos().existencias()); as texto) {
        <div class="text-[11px] text-error mt-0.5">{{ texto }}</div>
      }
    </td>
    <td class="px-3 py-2">
      <input
        class="input input-bordered input-xs w-full"
        placeholder="Color:Rojo, Talla:M"
        [attr.aria-label]="t('admin.catalog.detail.inv.options')"
        [formField]="campos().opciones"
      />
    </td>
    <ng-content />
  `,
  host: { class: 'table-row border-t border-ink-100 bg-base-200/40' },
})
export class FilasDeVariante {
  readonly campos = input.required<FieldTree<BorradorDeVariante>>();

  protected readonly t = inject(TraduccionService).t;
  protected readonly iconoImagen = faImage;

  /** Lo que hay escrito ahora mismo en la fila: la miniatura sale de aquí, no de otra copia. */
  protected readonly valores = computed(() => this.campos()().value());

  protected fallo(estado: EstadoDeCampo): string {
    return falloDelCampo(this.t, estado);
  }
}
