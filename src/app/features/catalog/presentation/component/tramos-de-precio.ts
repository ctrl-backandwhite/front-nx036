import { Component, computed, inject, input } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { TramoDePrecio } from '../../domain/model/producto';

interface Escalon {
  readonly rango: string;
  readonly precio: string;
  readonly activo: boolean;
}

/**
 * Los precios por cantidad, como los publica el proveedor.
 *
 * <p>Se retiraron en su día por una razón buena —enseñar cuatro cifras distintas para el mismo
 * producto obliga a quien compra a averiguar cuál le toca— y vuelven por otra igual de buena: quien
 * compra aquí es un revendedor, y saber que a partir de cincuenta unidades el precio baja es
 * justamente lo que decide el tamaño del pedido. Sin la tabla, esa rebaja existe pero es invisible.
 *
 * <p>Lo que resuelve la objeción de entonces es marcar cuál se está aplicando AHORA: el escalón
 * activo va resaltado, así que no hay que adivinar nada. Con un solo tramo no se pinta nada: una
 * tabla de una fila no informa de ningún salto.
 */
@Component({
  selector: 'nx-tramos-de-precio',
  template: `
    @if (escalones().length > 1) {
      <div class="mt-3 pt-3 border-t border-base-300">
        <div class="text-[11px] opacity-60 mb-1.5">{{ t('pdp.tiers.title') }}</div>
        <div class="flex flex-wrap gap-2">
          @for (escalon of escalones(); track escalon.rango) {
            <div
              class="rounded-lg border px-2.5 py-1.5 leading-tight"
              [class]="
                escalon.activo
                  ? 'border-primary bg-primary/5'
                  : 'border-base-300'
              "
            >
              <div class="text-[10px] opacity-60">{{ escalon.rango }}</div>
              <div class="text-[13px] font-semibold font-mono">{{ escalon.precio }}</div>
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class TramosDePrecio {
  readonly tramos = input.required<readonly TramoDePrecio[]>();
  /** Unidades elegidas ahora mismo, para señalar qué escalón se está pagando. */
  readonly unidades = input(1);

  protected readonly t = inject(TraduccionService).t;

  protected readonly escalones = computed<Escalon[]>(() => {
    const ordenados = [...this.tramos()].sort((a, b) => a.cantidadMinima - b.cantidadMinima);
    const unidades = this.unidades();
    // El que se aplica es el MAYOR de los que la cantidad alcanza: son escalones «a partir de N»,
    // no franjas independientes.
    const aplicable = ordenados.filter((t) => unidades >= t.cantidadMinima).pop();

    return ordenados.map((tramo) => ({
      rango: this.rangoDe(tramo),
      // El importe lo pone el backend: componerlo aquí enseñaría un número que el pedido no cobra.
      precio: tramo.precioUnitarioFormateado ?? '—',
      activo: tramo === aplicable,
    }));
  });

  private rangoDe(tramo: TramoDePrecio): string {
    const unidad = this.t('pdp.tiers.units');
    if (tramo.cantidadMaxima && tramo.cantidadMaxima > tramo.cantidadMinima) {
      return `${tramo.cantidadMinima} – ${tramo.cantidadMaxima} ${unidad}`;
    }
    return `${tramo.cantidadMinima}+ ${unidad}`;
  }
}
