import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowDownWideShort,
  faArrowUpShortWide,
  faBoxArchive,
  faCopy,
  faImage,
  faPause,
  faPen,
  faPlay,
  faSort,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { EsqueletoDeFila } from '@ds/component/marcador/esqueleto-de-fila';
import { ImagenSegura } from '@ds/component/marcador/imagen-segura';
import { CatalogoAdminStore } from '../../../application/catalogo/state/catalogo-admin.store';
import {
  EstadoDeProducto,
  ProductoDeListado,
  tendenciaSobreCien,
  ventasAbreviadas,
} from '../../../domain/catalogo/model/producto-admin';
import { etiquetaDeEstado } from '../etiquetas';

/** Lo que la tabla pide hacer con una fila. La decisión —y el aviso— son de la página. */
export interface AccionSobreProducto {
  readonly producto: ProductoDeListado;
  readonly clase: 'estado' | 'verificado' | 'duplicar' | 'eliminar';
  readonly estado?: EstadoDeProducto;
  readonly verificado?: boolean;
}

/**
 * La tabla del catálogo.
 *
 * <p>La columna «Precio» es el COSTE de origen convertido a la moneda de quien administra. NO es lo que
 * paga el cliente: ese lo calcula el backend con el margen, el IVA, el envío y el arancel, y aquí no se
 * replica ninguna de esas fórmulas.
 *
 * <p>MOBILE FIRST: la tabla vive dentro de un contenedor que se desplaza en horizontal por su cuenta,
 * así el cuerpo de la página nunca se desplaza de lado en el móvil.
 */
@Component({
  selector: 'nx-tabla-de-productos',
  imports: [RouterLink, FaIconComponent, EsqueletoDeFila, ImagenSegura],
  template: `
    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="table table-zebra table-sm">
          <thead class="bg-ink-50 text-ink-500 text-left text-[12px]">
            <tr>
              <th class="px-3 py-2 w-8">
                <input
                  type="checkbox"
                  class="checkbox checkbox-xs"
                  [checked]="todosMarcados()"
                  (change)="alternaTodos.emit()"
                  [attr.aria-label]="t('admin.categories.select_all')"
                />
              </th>
              <th class="px-4 py-2 font-medium">{{ t('admin.catalog.col.product') }}</th>
              <th class="px-4 py-2 font-medium text-right">
                <button
                  type="button"
                  class="inline-flex items-center gap-1 ml-auto hover:text-primary transition-colors"
                  (click)="alternaOrden.emit()"
                  [title]="t('admin.catalog.sort.byPrice')"
                >
                  {{ t('admin.catalog.col.price') }}
                  <fa-icon
                    [icon]="iconoDeOrden()"
                    class="text-[10px]"
                    [class.text-primary]="!!orden()"
                    [class.text-base-content]="!orden()"
                  />
                </button>
              </th>
              <th class="px-4 py-2 font-medium text-right">{{ t('admin.catalog.col.sales') }}</th>
              <th class="px-4 py-2 font-medium text-right">{{ t('admin.catalog.col.trend') }}</th>
              <th class="px-4 py-2 font-medium">{{ t('admin.catalog.col.status') }}</th>
              <th class="px-4 py-2 font-medium text-center">{{ t('admin.catalog.col.verified') }}</th>
              <th class="px-4 py-2 font-medium">{{ t('admin.catalog.col.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            @if (cargando() && productos().length === 0) {
              @for (fila of esqueletos; track fila) {
                <nx-esqueleto-de-fila [columnas]="8" />
              }
            }
            @for (producto of productos(); track producto.id) {
              <tr
                class="border-t border-ink-100 hover:bg-ink-50/50"
                [class.bg-brand-50]="marcado(producto.id)"
              >
                <td class="px-3 py-2 w-8">
                  <input
                    type="checkbox"
                    class="checkbox checkbox-xs"
                    [checked]="marcado(producto.id)"
                    (change)="alternaUno.emit(producto.id)"
                    [attr.aria-label]="producto.titulo"
                  />
                </td>
                <td class="px-4 py-2">
                  <a
                    [routerLink]="['/admin/catalog', producto.id]"
                    class="flex items-center gap-2 hover:text-brand-700"
                  >
                    <nx-imagen-segura
                      [src]="producto.imagenPrincipal"
                      [alt]="producto.titulo"
                      clase="w-10 h-10 object-cover rounded"
                      claseMarcador="w-10 h-10 rounded"
                    />
                    <span class="line-clamp-1 text-[13px]">{{ producto.titulo }}</span>
                  </a>
                </td>
                <td class="px-4 py-2 text-right font-medium">{{ coste(producto) }}</td>
                <td class="px-4 py-2 text-right text-[12px]">
                  {{ ventas(producto.ventasMensuales) }}
                </td>
                <td
                  class="px-4 py-2 text-right text-[12px]"
                  [title]="t('admin.catalog.detail.trend_tooltip')"
                >
                  {{ tendencia(producto.tendencia) }}
                </td>
                <td class="px-4 py-2">
                  <span class="badge bg-ink-100 text-ink-700">{{ estado(producto.estado) }}</span>
                </td>
                <td class="px-4 py-2 text-center">
                  <input
                    type="checkbox"
                    class="checkbox checkbox-xs checkbox-success"
                    [checked]="producto.verificado"
                    (change)="marcaVerificado(producto, $event)"
                    [title]="t(producto.verificado ? 'admin.catalog.verified.yes' : 'admin.catalog.verified.no')"
                    [attr.aria-label]="t('admin.catalog.col.verified')"
                  />
                </td>
                <td class="px-4 py-2">
                  <div class="flex gap-1">
                    @if (producto.estado !== 'ACTIVE') {
                      <button
                        type="button"
                        class="btn btn-outline btn-square text-[11px]"
                        [title]="t('admin.catalog.actions.publish')"
                        [attr.aria-label]="t('admin.catalog.actions.publish')"
                        (click)="pide(producto, 'estado', 'ACTIVE')"
                      >
                        <fa-icon [icon]="iconos.publicar" />
                      </button>
                    }
                    @if (producto.estado === 'ACTIVE') {
                      <button
                        type="button"
                        class="btn btn-outline btn-square text-[11px]"
                        [title]="t('admin.catalog.actions.pause')"
                        [attr.aria-label]="t('admin.catalog.actions.pause')"
                        (click)="pide(producto, 'estado', 'PAUSED')"
                      >
                        <fa-icon [icon]="iconos.pausar" />
                      </button>
                    }
                    <a
                      [routerLink]="['/admin/catalog', producto.id]"
                      class="btn btn-outline btn-square text-[11px]"
                      [title]="t('admin.catalog.actions.edit')"
                      [attr.aria-label]="t('admin.catalog.actions.edit')"
                    >
                      <fa-icon [icon]="iconos.editar" />
                    </a>
                    <button
                      type="button"
                      class="btn btn-outline btn-square text-[11px]"
                      [title]="t('admin.catalog.actions.duplicate')"
                      [attr.aria-label]="t('admin.catalog.actions.duplicate')"
                      (click)="pide(producto, 'duplicar')"
                    >
                      <fa-icon [icon]="iconos.duplicar" />
                    </button>
                    @if (producto.estado !== 'ARCHIVED') {
                      <button
                        type="button"
                        class="btn btn-outline btn-square text-[11px]"
                        [title]="t('admin.catalog.actions.archive')"
                        [attr.aria-label]="t('admin.catalog.actions.archive')"
                        (click)="pide(producto, 'estado', 'ARCHIVED')"
                      >
                        <fa-icon [icon]="iconos.archivar" />
                      </button>
                    }
                    <button
                      type="button"
                      class="btn btn-outline btn-square text-[11px] hover:border-red-300 hover:text-red-700"
                      [title]="t('admin.catalog.actions.delete')"
                      [attr.aria-label]="t('admin.catalog.actions.delete')"
                      (click)="pide(producto, 'eliminar')"
                    >
                      <fa-icon [icon]="iconos.borrar" />
                    </button>
                  </div>
                </td>
              </tr>
            }
            @if (!cargando() && productos().length === 0) {
              <tr>
                <td colspan="8" class="px-4 py-10 text-center text-ink-500 text-[13px]">
                  {{ t('filters.no_results') }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class TablaDeProductos {
  readonly productos = input.required<readonly ProductoDeListado[]>();
  readonly cargando = input(false);
  readonly orden = input<string | undefined>(undefined);

  readonly alternaUno = output<string>();
  readonly alternaTodos = output<void>();
  readonly alternaOrden = output<void>();
  readonly acciona = output<AccionSobreProducto>();

  protected readonly t = inject(TraduccionService).t;
  private readonly almacen = inject(CatalogoAdminStore);

  protected readonly esqueletos = Array.from({ length: 8 }, (_, i) => i);
  protected readonly iconos = {
    publicar: faPlay,
    pausar: faPause,
    editar: faPen,
    duplicar: faCopy,
    archivar: faBoxArchive,
    borrar: faTrash,
    imagen: faImage,
  };

  protected readonly iconoDeOrden = computed(() => {
    if (this.orden() === 'price_asc') {
      return faArrowUpShortWide;
    }
    return this.orden() === 'price_desc' ? faArrowDownWideShort : faSort;
  });

  protected readonly todosMarcados = computed(() => {
    const ids = this.productos().map((producto) => producto.id);
    return ids.length > 0 && ids.every((id) => this.almacen.seleccion().has(id));
  });

  protected marcado(id: string): boolean {
    return this.almacen.seleccion().has(id);
  }

  protected estado(valor: string): string {
    return etiquetaDeEstado(this.t, valor);
  }

  protected ventas(cantidad: number): string {
    return ventasAbreviadas(cantidad);
  }

  protected tendencia(valor?: number): string {
    return tendenciaSobreCien(valor);
  }

  /** El coste, convertido y formateado por el almacén: la conversión es una sola en toda la pantalla. */
  protected coste(producto: ProductoDeListado): string {
    return producto.coste != null
      ? this.almacen.formatea(Number(producto.coste), producto.divisa ?? 'CNY')
      : '—';
  }

  protected pide(
    producto: ProductoDeListado,
    clase: AccionSobreProducto['clase'],
    estado?: EstadoDeProducto,
  ): void {
    this.acciona.emit({ producto, clase, estado });
  }

  protected marcaVerificado(producto: ProductoDeListado, evento: Event): void {
    this.acciona.emit({
      producto,
      clase: 'verificado',
      verificado: (evento.target as HTMLInputElement).checked,
    });
  }
}
