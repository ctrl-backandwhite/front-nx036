import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBoxesStacked,
  faEye,
  faEyeSlash,
  faFolderPlus,
  faPen,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { CategoriaAdmin, estaVaciaYActiva } from '../../../domain/catalogo/model/categoria-admin';
import { EsqueletoDeFila } from './esqueleto-de-fila';

/**
 * La tabla de categorías.
 *
 * <p>Una categoría ACTIVA Y VACÍA se marca aparte: no es un error, pero deja un hueco en el menú de la
 * tienda y hay que poder verlo de un vistazo entre dos mil filas.
 */
@Component({
  selector: 'nx-tabla-de-categorias',
  imports: [RouterLink, FaIconComponent, EsqueletoDeFila],
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
                  [checked]="todasMarcadas()"
                  (change)="alternaTodas.emit()"
                  [attr.aria-label]="t('admin.categories.select_all')"
                />
              </th>
              <th class="px-4 py-2 font-medium">#</th>
              <th class="px-4 py-2 font-medium">{{ t('admin.categories.col.slug') }}</th>
              <th class="px-4 py-2 font-medium">{{ t('admin.categories.col.zh') }}</th>
              <th class="px-4 py-2 font-medium">{{ t('admin.categories.col.en') }}</th>
              <th class="px-4 py-2 font-medium">{{ t('admin.categories.col.es') }}</th>
              <th class="px-4 py-2 font-medium">{{ t('admin.categories.col.pt') }}</th>
              <th class="px-4 py-2 font-medium">{{ t('admin.categories.col.products') }}</th>
              <th class="px-4 py-2 font-medium">{{ t('admin.categories.col.status') }}</th>
              <th class="px-4 py-2 font-medium">{{ t('admin.categories.col.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            @if (cargando() && categorias().length === 0) {
              @for (fila of esqueletos; track fila) {
                <nx-esqueleto-de-fila [columnas]="10" />
              }
            }
            @for (categoria of categorias(); track categoria.id) {
              <tr
                class="border-t border-ink-100 hover:bg-ink-50/50"
                [class.bg-brand-50]="marcadas().has(categoria.id)"
              >
                <td class="px-3 py-2 w-8">
                  <input
                    type="checkbox"
                    class="checkbox checkbox-xs"
                    [checked]="marcadas().has(categoria.id)"
                    (change)="alternaUna.emit(categoria.id)"
                    [attr.aria-label]="categoria.slug"
                  />
                </td>
                <td class="px-4 py-2 w-10">{{ categoria.posicion }}</td>
                <td class="px-4 py-2 font-mono text-xs">{{ categoria.slug }}</td>
                <td class="px-4 py-2">{{ categoria.nombreZh || '—' }}</td>
                <td class="px-4 py-2">{{ nombreEn(categoria, 'en') }}</td>
                <td class="px-4 py-2">{{ nombreEn(categoria, 'es') }}</td>
                <td class="px-4 py-2">{{ nombreEn(categoria, 'pt') }}</td>
                <td class="px-4 py-2">{{ categoria.numeroDeProductos }}</td>
                <td class="px-4 py-2">
                  @if (vaciaYActiva(categoria)) {
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-700"
                      [title]="t('admin.categories.empty_active_tooltip')"
                    >
                      {{ t('admin.categories.empty_badge') }}
                    </span>
                  } @else {
                    <span
                      [class]="
                        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ' +
                        (categoria.activa ? 'bg-emerald-100 text-emerald-700' : 'bg-ink-100 text-ink-600')
                      "
                    >
                      {{ t(categoria.activa ? 'admin.categories.active' : 'admin.categories.inactive') }}
                    </span>
                  }
                </td>
                <td class="px-4 py-2">
                  <div class="flex gap-1">
                    <button
                      type="button"
                      class="btn btn-outline btn-square text-[11px]"
                      [title]="t('admin.categories.edit')"
                      [attr.aria-label]="t('admin.categories.edit')"
                      (click)="edita.emit(categoria)"
                    >
                      <fa-icon [icon]="iconos.editar" />
                    </button>
                    <button
                      type="button"
                      class="btn btn-outline btn-square text-[11px]"
                      [title]="t(categoria.activa ? 'admin.categories.deactivate' : 'admin.categories.activate')"
                      [attr.aria-label]="t(categoria.activa ? 'admin.categories.deactivate' : 'admin.categories.activate')"
                      (click)="activa.emit(categoria)"
                    >
                      <fa-icon [icon]="categoria.activa ? iconos.ocultar : iconos.ver" />
                    </button>
                    <a
                      [routerLink]="['/admin/catalog']"
                      [queryParams]="{ categoryId: categoria.id }"
                      class="btn btn-outline btn-square text-[11px]"
                      [title]="t('admin.categories.view_products')"
                      [attr.aria-label]="t('admin.categories.view_products')"
                    >
                      <fa-icon [icon]="iconos.productos" />
                    </a>
                    <button
                      type="button"
                      class="btn btn-outline btn-square text-[11px] hover:border-red-300 hover:text-red-700"
                      [title]="t('admin.categories.delete')"
                      [attr.aria-label]="t('admin.categories.delete')"
                      (click)="borra.emit(categoria)"
                    >
                      <fa-icon [icon]="iconos.borrar" />
                    </button>
                  </div>
                </td>
              </tr>
            }
            @if (!cargando() && categorias().length === 0) {
              <tr>
                <td colspan="10" class="px-4 py-12 text-center">
                  <fa-icon [icon]="iconos.vacia" class="text-3xl text-ink-300 mb-2" />
                  <div class="text-ink-600 font-medium">{{ t('admin.categories.empty.title') }}</div>
                  <div class="text-ink-500 text-[12px]">{{ t('admin.categories.empty.body') }}</div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class TablaDeCategorias {
  readonly categorias = input.required<readonly CategoriaAdmin[]>();
  readonly marcadas = input.required<ReadonlySet<string>>();
  readonly cargando = input(false);

  readonly alternaUna = output<string>();
  readonly alternaTodas = output<void>();
  readonly edita = output<CategoriaAdmin>();
  readonly activa = output<CategoriaAdmin>();
  readonly borra = output<CategoriaAdmin>();

  protected readonly t = inject(TraduccionService).t;
  protected readonly esqueletos = Array.from({ length: 8 }, (_, i) => i);
  protected readonly iconos = {
    editar: faPen,
    borrar: faTrash,
    ver: faEye,
    ocultar: faEyeSlash,
    productos: faBoxesStacked,
    vacia: faFolderPlus,
  };

  /**
   * El nombre en un idioma, o un guion.
   *
   * <p>Va por método y no con un `??` en la plantilla porque el tipo del mapa promete una cadena
   * siempre, pero una categoría sin traducir a ese idioma no tiene la clave.
   */
  protected nombreEn(categoria: CategoriaAdmin, idioma: string): string {
    return categoria.nombres[idioma] || '—';
  }

  protected readonly todasMarcadas = computed(() => {
    const ids = this.categorias().map((categoria) => categoria.id);
    return ids.length > 0 && ids.every((id) => this.marcadas().has(id));
  });

  protected vaciaYActiva(categoria: CategoriaAdmin): boolean {
    return estaVaciaYActiva(categoria);
  }
}
