import { Component, inject, input, output } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faImage } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { BorradorDeVariante } from '../../../../domain/catalogo/model/variante-de-producto';

/**
 * Las celdas editables de una variante: foto, SKU, título, precio, existencias y opciones.
 *
 * <p>Las mismas seis celdas se usan en la edición de UNA fila y en la de TODAS a la vez; la séptima
 * —los botones— la pone quien lo monta con `ng-content`, que es lo único que cambia entre los dos casos.
 *
 * <p>El componente ES la fila: se maqueta con la utilidad `table-row`, de modo que el selector cumple la
 * norma —todo componente empieza por `nx-`— sin dejar de comportarse como un `<tr>`.
 *
 * <p>El precio va en yuanes y sin margen: es el valor crudo, que es el que se guarda.
 */
@Component({
  selector: 'nx-filas-de-variante',
  imports: [NgOptimizedImage, FaIconComponent],
  template: `
    <td class="px-3 py-2">
      <div class="flex items-center gap-1">
        @if (borrador().urlImagen) {
          <img
            [ngSrc]="borrador().urlImagen"
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
          [value]="borrador().urlImagen"
          (input)="emite('urlImagen', $event)"
        />
      </div>
    </td>
    <td class="px-3 py-2">
      <input
        class="input input-bordered input-xs w-full"
        [attr.aria-label]="t('admin.catalog.detail.inv.sku')"
        [value]="borrador().sku"
        (input)="emite('sku', $event)"
      />
    </td>
    <td class="px-3 py-2">
      <input
        class="input input-bordered input-xs w-full"
        [placeholder]="t('admin.variants.title_ph')"
        [attr.aria-label]="t('admin.variants.title_ph')"
        [value]="borrador().titulo"
        (input)="emite('titulo', $event)"
      />
    </td>
    <td class="px-3 py-2">
      <input
        type="number"
        step="0.01"
        class="input input-bordered input-xs w-full text-right"
        placeholder="0.00"
        [attr.aria-label]="t('admin.catalog.col.price')"
        [value]="borrador().precio"
        (input)="emite('precio', $event)"
      />
    </td>
    <td class="px-3 py-2">
      <input
        type="number"
        class="input input-bordered input-xs w-full text-right"
        placeholder="0"
        [attr.aria-label]="t('admin.catalog.detail.inv.stock')"
        [value]="borrador().existencias"
        (input)="emite('existencias', $event)"
      />
    </td>
    <td class="px-3 py-2">
      <input
        class="input input-bordered input-xs w-full"
        placeholder="Color:Rojo, Talla:M"
        [attr.aria-label]="t('admin.catalog.detail.inv.options')"
        [value]="borrador().opciones"
        (input)="emite('opciones', $event)"
      />
    </td>
    <ng-content />
  `,
  host: { class: 'table-row border-t border-ink-100 bg-base-200/40' },
})
export class FilasDeVariante {
  readonly borrador = input.required<BorradorDeVariante>();
  readonly cambia = output<Partial<BorradorDeVariante>>();

  protected readonly t = inject(TraduccionService).t;
  protected readonly iconoImagen = faImage;

  protected emite(campo: keyof BorradorDeVariante, evento: Event): void {
    this.cambia.emit({ [campo]: (evento.target as HTMLInputElement).value });
  }
}
