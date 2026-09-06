import { Component, inject, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faCheckCircle,
  faCircleCheck,
  faEye,
  faPen,
  faShield,
  faStar,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { nombreDePais } from '@ds/component/pais/paises';
import {
  ProveedorAdmin,
  ubicacionDeProveedor,
} from '../../../domain/catalogo/model/proveedor-admin';
import { EsqueletoDeFila } from './esqueleto-de-fila';

/**
 * La tabla de proveedores.
 *
 * <p>La ciudad y el país se unen SOLO con lo que existe: la mayoría llega del volcado de 1688 sin
 * ciudad, y concatenar a ciegas dejaba filas que empezaban por coma («, China»).
 */
@Component({
  selector: 'nx-tabla-de-proveedores',
  imports: [FaIconComponent, EsqueletoDeFila],
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
              <th class="px-4 py-2 font-medium">{{ t('admin.suppliers.col.name') }}</th>
              <th class="px-4 py-2 font-medium">
                {{ t('admin.suppliers.col.city') }} / {{ t('admin.suppliers.col.country') }}
              </th>
              <th class="px-4 py-2 font-medium text-right">{{ t('admin.suppliers.col.rating') }}</th>
              <th class="px-4 py-2 font-medium text-right">{{ t('admin.suppliers.col.years') }}</th>
              <th class="px-4 py-2 font-medium text-center">{{ t('admin.suppliers.col.verified') }}</th>
              <th class="px-4 py-2 font-medium text-center">TrustPass</th>
              <th class="px-4 py-2 font-medium text-right">{{ t('admin.catalog.col.product') }}</th>
              <th class="px-4 py-2 font-medium w-44">{{ t('admin.suppliers.col.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            @if (cargando() && proveedores().length === 0) {
              @for (fila of esqueletos; track fila) {
                <nx-esqueleto-de-fila [columnas]="9" />
              }
            }
            @for (proveedor of proveedores(); track proveedor.id) {
              <tr
                class="border-t border-ink-100 hover:bg-ink-50/50"
                [class.bg-brand-50]="marcados().has(proveedor.id)"
              >
                <td class="px-3 py-2 w-8">
                  <input
                    type="checkbox"
                    class="checkbox checkbox-xs"
                    [checked]="marcados().has(proveedor.id)"
                    (change)="alternaUno.emit(proveedor.id)"
                    [attr.aria-label]="proveedor.nombre"
                  />
                </td>
                <td class="px-4 py-2">
                  <button
                    type="button"
                    class="font-medium text-[13px] text-brand-700 hover:underline text-left"
                    (click)="abre.emit(proveedor)"
                  >
                    {{ proveedor.nombre }}
                  </button>
                  @if (enChino() && proveedor.nombreZh) {
                    <div class="text-[11px] text-ink-500">{{ proveedor.nombreZh }}</div>
                  }
                </td>
                <td class="px-4 py-2 text-[12px] text-ink-600">{{ ubicacion(proveedor) }}</td>
                <td class="px-4 py-2 text-right text-[13px]">
                  <fa-icon [icon]="iconos.estrella" class="text-amber-500 text-[11px]" />
                  {{ proveedor.valoracion ?? '—' }}
                </td>
                <td class="px-4 py-2 text-right text-[12px]">{{ proveedor.anosActivo ?? '—' }}</td>
                <td class="px-4 py-2 text-center">
                  @if (proveedor.verificado) {
                    <fa-icon [icon]="iconos.verificado" class="text-emerald-500" />
                  }
                </td>
                <td class="px-4 py-2 text-center">
                  @if (proveedor.trustPass) {
                    <fa-icon [icon]="iconos.escudo" class="text-brand-500" />
                  }
                </td>
                <td class="px-4 py-2 text-right font-medium">{{ proveedor.numeroDeProductos }}</td>
                <td class="px-4 py-2">
                  <div class="flex gap-1">
                    <button
                      type="button"
                      class="btn btn-outline text-[11px]"
                      [title]="t('admin.suppliers.actions.view')"
                      [attr.aria-label]="t('admin.suppliers.actions.view')"
                      (click)="abre.emit(proveedor)"
                    >
                      <fa-icon [icon]="iconos.ver" />
                    </button>
                    <button
                      type="button"
                      class="btn btn-outline text-[11px]"
                      [title]="t('admin.suppliers.actions.edit')"
                      [attr.aria-label]="t('admin.suppliers.actions.edit')"
                      (click)="edita.emit(proveedor)"
                    >
                      <fa-icon [icon]="iconos.editar" />
                    </button>
                    <button
                      type="button"
                      class="btn btn-outline text-[11px]"
                      [title]="t(proveedor.verificado ? 'admin.suppliers.actions.unverify' : 'admin.suppliers.actions.verify')"
                      [attr.aria-label]="t(proveedor.verificado ? 'admin.suppliers.actions.unverify' : 'admin.suppliers.actions.verify')"
                      (click)="verifica.emit(proveedor)"
                    >
                      <fa-icon [icon]="proveedor.verificado ? iconos.marcado : iconos.verificado" />
                    </button>
                    <button
                      type="button"
                      class="btn btn-outline text-[11px] hover:border-red-300 hover:text-red-700"
                      [title]="t('admin.suppliers.actions.delete')"
                      [attr.aria-label]="t('admin.suppliers.actions.delete')"
                      (click)="borra.emit(proveedor)"
                    >
                      <fa-icon [icon]="iconos.borrar" />
                    </button>
                  </div>
                </td>
              </tr>
            }
            @if (!cargando() && proveedores().length === 0) {
              <tr>
                <td colspan="9" class="px-4 py-10 text-center text-ink-500 text-[13px]">
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
export class TablaDeProveedores {
  readonly proveedores = input.required<readonly ProveedorAdmin[]>();
  readonly marcados = input.required<ReadonlySet<string>>();
  readonly cargando = input(false);

  readonly alternaUno = output<string>();
  readonly alternaTodos = output<void>();
  readonly abre = output<ProveedorAdmin>();
  readonly edita = output<ProveedorAdmin>();
  readonly verifica = output<ProveedorAdmin>();
  readonly borra = output<ProveedorAdmin>();

  protected readonly t = inject(TraduccionService).t;
  private readonly traduccion = inject(TraduccionService);
  protected readonly esqueletos = Array.from({ length: 8 }, (_, i) => i);
  protected readonly iconos = {
    estrella: faStar,
    verificado: faCheckCircle,
    marcado: faCircleCheck,
    escudo: faShield,
    ver: faEye,
    editar: faPen,
    borrar: faTrash,
  };

  /** El nombre chino solo se pinta en chino: en los demás idiomas es ruido en la fila. */
  protected enChino(): boolean {
    return this.traduccion.idioma() === 'zh';
  }

  protected ubicacion(proveedor: ProveedorAdmin): string {
    return ubicacionDeProveedor(proveedor.ciudad, nombreDePais(proveedor.pais) || proveedor.pais);
  }

  protected todosMarcados(): boolean {
    const ids = this.proveedores().map((proveedor) => proveedor.id);
    return ids.length > 0 && ids.every((id) => this.marcados().has(id));
  }
}
