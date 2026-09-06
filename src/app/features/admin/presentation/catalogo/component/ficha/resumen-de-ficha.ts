import { Component, computed, inject, input, output } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { CatalogoAdminStore } from '../../../../application/catalogo/state/catalogo-admin.store';
import {
  FichaDeProducto,
  ImporteEnYuanes,
} from '../../../../domain/catalogo/model/ficha-de-producto';
import { tendenciaSobreCien } from '../../../../domain/catalogo/model/producto-admin';
import { conRespaldo } from '../../etiquetas';
import { FilaDeDato } from './fila-de-dato';
import { FilaDeYuanes } from './fila-de-yuanes';

/**
 * El resumen de la ficha: precio de venta, coste y las tres palancas en yuanes.
 *
 * <p>Se enseñan las DOS cifras a propósito. El precio de venta lo calcula el backend —margen, IVA,
 * envío, arancel— y es lo que paga quien compra; el coste base es la referencia con la que se decide.
 * Confundirlos es lo que llevó a vender por debajo del coste.
 *
 * <p>El recargo y las dos bolsas de subvención solo las ve el administrador: el cliente ve el total ya
 * formateado, que las incluye. Se editan con doble clic aquí mismo, o en lote desde el listado.
 */
@Component({
  selector: 'nx-resumen-de-ficha',
  imports: [FilaDeDato, FilaDeYuanes],
  template: `
    <div class="card p-4 space-y-1 text-sm">
      <nx-fila-de-dato [etiqueta]="t('admin.catalog.col.price')" [valor]="precioDeVenta()" />
      <nx-fila-de-dato [etiqueta]="t('admin.catalog.detail.base_cost')" [valor]="coste()" />

      <nx-fila-de-yuanes
        campo="recargo"
        [etiqueta]="t('admin.catalog.detail.surcharge')"
        [etiquetaDelCampo]="t('admin.catalog.fields.surchargeCny')"
        [ayuda]="t('admin.catalog.detail.surcharge_dbl')"
        [formateado]="ficha().yuanesFormateados.recargo"
        [crudo]="ficha().yuanes.recargo"
        (guardado)="guarda.emit($event)"
      />
      <nx-fila-de-yuanes
        campo="subvencionDeEnvio"
        [etiqueta]="t('admin.catalog.detail.shipping_user')"
        [etiquetaDelCampo]="t('admin.catalog.fields.shippingUserCny')"
        [ayuda]="t('admin.catalog.detail.shipping_user_dbl')"
        [formateado]="ficha().yuanesFormateados.subvencionDeEnvio"
        [crudo]="ficha().yuanes.subvencionDeEnvio"
        (guardado)="guarda.emit($event)"
      />
      <nx-fila-de-yuanes
        campo="subvencionDeArancel"
        [etiqueta]="t('admin.catalog.detail.duty_user')"
        [etiquetaDelCampo]="t('admin.catalog.fields.dutyUserCny')"
        [ayuda]="t('admin.catalog.detail.duty_user_dbl')"
        [formateado]="ficha().yuanesFormateados.subvencionDeArancel"
        [crudo]="ficha().yuanes.subvencionDeArancel"
        (guardado)="guarda.emit($event)"
      />

      <nx-fila-de-dato
        [etiqueta]="t('admin.catalog.col.sales')"
        [valor]="String(ficha().ventasMensuales)"
      />
      <nx-fila-de-dato
        [etiqueta]="t('admin.catalog.detail.trend_label')"
        [valor]="tendencia()"
      />
      <nx-fila-de-dato [etiqueta]="t('admin.catalog.detail.moq')" [valor]="String(ficha().moq)" />
      <nx-fila-de-dato
        [etiqueta]="t('admin.catalog.detail.source')"
        [valor]="ficha().origen || '—'"
      />
      @if (ficha().fabricante && !ficha().fabricante!.completo) {
        <p role="alert" class="text-[11px] text-amber-700 mt-2">
          {{ avisoDeFabricante() }}
        </p>
      }
    </div>
  `,
})
export class ResumenDeFicha {
  readonly ficha = input.required<FichaDeProducto>();
  readonly guarda = output<{ campo: ImporteEnYuanes; importe: number }>();

  protected readonly t = inject(TraduccionService).t;
  private readonly almacen = inject(CatalogoAdminStore);
  protected readonly String = String;

  protected readonly coste = computed(() => {
    const ficha = this.ficha();
    return ficha.coste != null ? this.almacen.formatea(Number(ficha.coste), ficha.divisa) : '—';
  });

  /** El precio de VENTA, ya calculado por el backend. Si no viene, se cae al coste como referencia. */
  protected readonly precioDeVenta = computed(() => {
    const ficha = this.ficha();
    if (ficha.precioDeVenta != null) {
      return this.almacen.formatea(
        Number(ficha.precioDeVenta),
        ficha.divisaDeVenta ?? ficha.divisa,
      );
    }
    return this.coste();
  });

  protected readonly tendencia = computed(() => tendenciaSobreCien(this.ficha().tendencia));

  /**
   * El fabricante lo exige el artículo 19 del Reglamento (UE) 2023/988 y 1688 no lo entrega, así que
   * hay que completarlo a mano. Sin él, la oferta en línea no cumple.
   */
  protected readonly avisoDeFabricante = computed(() =>
    conRespaldo(
      this.t,
      'admin.catalog.detail.manufacturer_missing',
      'Faltan datos del fabricante exigidos por el Reglamento (UE) 2023/988.',
    ),
  );
}
