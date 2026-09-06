import { Component, computed, inject, input } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PrecioParaMostrar } from '../../domain/model/producto';
import { PrecioDestacado } from '../../domain/model/seleccion-de-variante';
import { EtiquetaPrecio } from './etiqueta-precio';

/**
 * El precio destacado de la ficha.
 *
 * <p>Un solo precio, coherente: el de la variante elegida —que es lo que el pedido va a cobrar—, y
 * mientras no hay variante, el del tramo o el publicado. La rejilla de precios por cantidad se
 * RETIRÓ: enseñar cuatro cifras distintas para el mismo producto obliga a quien compra a averiguar
 * cuál le toca, y la que le toca ya se le está aplicando. El tramo se sigue usando para calcular ese
 * precio; lo que desapareció es la tabla, no el cálculo.
 *
 * <p>El desglose de conceptos (base, IVA, envío, recargo, subsidios) NO está aquí: es exclusivo del
 * administrador y vive en un componente aparte que se carga en diferido, para que su código ni siquiera
 * viaje al navegador de quien compra.
 */
@Component({
  selector: 'nx-bloque-precio',
  imports: [EtiquetaPrecio],
  template: `
    <div class="card card-border bg-base-100">
      <div class="card-body p-4">
        <div class="flex items-baseline gap-3 flex-wrap">
          <nx-etiqueta-precio [precio]="precio()" tamano="lg" />
          @if (moq() > 1) {
            <span class="badge badge-outline">
              {{ t('product.moq') }} <strong class="ml-1">{{ moq() }}</strong>
            </span>
          }
        </div>
        <ng-content />
      </div>
    </div>
  `,
})
export class BloquePrecio {
  readonly destacado = input.required<PrecioDestacado>();
  readonly moq = input(1);

  protected readonly t = inject(TraduccionService).t;

  /**
   * Manda la CADENA del backend, que es quien pone precios. Sin ella se pinta un guión: componer el
   * importe aquí enseñaría un número que el pedido no va a cobrar —al cambiar de divisa, la ficha ya
   * cargada sigue en pantalla con los importes de la anterior—.
   */
  protected readonly precio = computed<PrecioParaMostrar>(() => {
    const destacado = this.destacado();
    return {
      formateado: destacado.formateado ?? '—',
      anteriorFormateado: destacado.anteriorFormateado,
      descuentoPorcentaje: destacado.descuentoPorcentaje,
    };
  });
}
