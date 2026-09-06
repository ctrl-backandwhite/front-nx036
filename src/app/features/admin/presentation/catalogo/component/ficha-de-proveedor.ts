import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { nombreDePais } from '@ds/component/pais/paises';
import { ProveedorAdmin, ubicacionDeProveedor } from '../../../domain/catalogo/model/proveedor-admin';
import { VentanaModal } from './ventana-modal';

/**
 * La ficha de un proveedor: su resumen, sus indicadores y el acceso a sus productos.
 *
 * <p>Los indicadores llegan del backend y pueden faltar —la mayoría de proveedores viene del volcado de
 * 1688 sin ellos—, así que cada uno se pinta con su guion en vez de dejar el hueco en blanco.
 */
@Component({
  selector: 'nx-ficha-de-proveedor',
  imports: [RouterLink, VentanaModal],
  template: `
    <nx-ventana-modal [titulo]="proveedor().nombre" ancho="sm:max-w-2xl" (cierra)="cierra.emit()">
      <div class="space-y-4">
        <div>
          @if (enChino() && proveedor().nombreZh) {
            <div class="text-[12px] text-ink-500">{{ proveedor().nombreZh }}</div>
          }
          <div class="text-[12px] text-ink-500 mt-1">{{ ubicacion() }}</div>
        </div>

        <section>
          <h3 class="text-[11px] uppercase tracking-wider text-ink-400 mb-2">
            {{ t('admin.suppliers.detail.summary') }}
          </h3>
          <div class="grid grid-cols-2 gap-3 text-sm">
            @for (dato of resumen(); track dato.etiqueta) {
              <div>
                <div class="text-[11px] tracking-wide text-ink-500">{{ dato.etiqueta }}</div>
                <div class="font-medium">{{ dato.valor }}</div>
              </div>
            }
          </div>
          <div class="text-[12px] text-ink-500 mt-2">
            {{ proveedor().descripcion || t('admin.suppliers.detail.no_description') }}
          </div>
        </section>

        <section>
          <h3 class="text-[11px] uppercase tracking-wider text-ink-400 mb-2">
            {{ t('admin.suppliers.detail.kpis') }}
          </h3>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            @for (indicador of indicadores(); track indicador.etiqueta) {
              <div class="card p-3 text-center">
                <div class="text-[11px] text-ink-500">{{ indicador.etiqueta }}</div>
                <div class="text-lg font-medium mt-1">{{ indicador.valor }}</div>
              </div>
            }
          </div>
        </section>

        <section>
          <h3 class="text-[11px] uppercase tracking-wider text-ink-400 mb-2">
            {{ t('admin.suppliers.detail.products') }}
          </h3>
          <div class="text-[12px] text-ink-500">{{ cuantosProductos() }}</div>
          <a
            [routerLink]="['/admin/catalog']"
            [queryParams]="{ supplierId: proveedor().id }"
            class="btn btn-outline text-[12px] mt-2 inline-flex"
            (click)="cierra.emit()"
          >
            {{ t('admin.suppliers.detail.view_products') }}
          </a>
        </section>
      </div>

      <ng-container pie>
        <button type="button" class="btn btn-outline text-[11px]" (click)="cierra.emit()">
          {{ t('actions.cancel') }}
        </button>
      </ng-container>
    </nx-ventana-modal>
  `,
})
export class FichaDeProveedor {
  readonly proveedor = input.required<ProveedorAdmin>();
  readonly cierra = output<void>();

  protected readonly t = inject(TraduccionService).t;
  private readonly traduccion = inject(TraduccionService);

  protected readonly enChino = computed(() => this.traduccion.idioma() === 'zh');

  protected readonly ubicacion = computed(() => {
    const proveedor = this.proveedor();
    return ubicacionDeProveedor(proveedor.ciudad, nombreDePais(proveedor.pais) || proveedor.pais);
  });

  protected readonly cuantosProductos = computed(() =>
    this.traduccion.tCon('admin.suppliers.detail.products_count', {
      n: this.proveedor().numeroDeProductos,
    }),
  );

  /**
   * Las dos rejillas de datos.
   *
   * <p>Van en `computed` y no en métodos: la plantilla las recorre, y devolver una lista NUEVA en cada
   * repintado obliga a reconstruir todas las filas aunque el proveedor no haya cambiado.
   */
  protected readonly resumen = computed<readonly { etiqueta: string; valor: string }[]>(() => {
    const proveedor = this.proveedor();
    const si = this.t('admin.suppliers.yes');
    const no = this.t('admin.suppliers.no');
    return [
      { etiqueta: this.t('admin.suppliers.col.rating'), valor: String(proveedor.valoracion ?? '—') },
      { etiqueta: this.t('admin.suppliers.col.years'), valor: String(proveedor.anosActivo ?? '—') },
      { etiqueta: this.t('admin.suppliers.col.verified'), valor: proveedor.verificado ? si : no },
      { etiqueta: 'TrustPass', valor: proveedor.trustPass ? si : no },
      {
        etiqueta: this.t('admin.catalog.col.product'),
        valor: String(proveedor.numeroDeProductos),
      },
      {
        etiqueta: this.t('admin.suppliers.detail.lead_time'),
        valor: proveedor.plazoDeEntregaDias ? `${proveedor.plazoDeEntregaDias} d` : '—',
      },
    ];
  });

  protected readonly indicadores = computed<readonly { etiqueta: string; valor: string }[]>(() => {
    const proveedor = this.proveedor();
    return [
      {
        etiqueta: this.t('admin.suppliers.detail.on_time'),
        valor: proveedor.puntualidadPorcentaje != null ? `${proveedor.puntualidadPorcentaje}%` : '—',
      },
      {
        etiqueta: this.t('admin.suppliers.detail.defect_rate'),
        valor: proveedor.tasaDeDefectos != null ? `${proveedor.tasaDeDefectos}%` : '—',
      },
      {
        etiqueta: this.t('admin.suppliers.detail.response_time'),
        valor: proveedor.horasDeRespuesta != null ? `${proveedor.horasDeRespuesta} h` : '—',
      },
    ];
  });
}
