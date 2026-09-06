import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBan,
  faCircleCheck,
  faEye,
  faPaperPlane,
  faRotateLeft,
  faTruck,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import {
  AccionSobrePedido,
  Pedido,
  accionesPermitidas,
} from '../../../domain/logistica/model/pedido';
import { Seleccion } from '../../../application/logistica/state/seleccion';
import { InsigniaEstado } from './insignia-estado';

/** Lo que se pide hacer sobre una fila. */
export interface PeticionSobrePedido {
  readonly pedido: Pedido;
  readonly accion: AccionSobrePedido;
}

/**
 * El listado de pedidos.
 *
 * <p>Solo PINTA y avisa: no llama al backend ni decide qué transiciones hay: se las pregunta al dominio.
 * Cada acción se confirma arriba, en la pantalla, porque la confirmación es una decisión de flujo y no
 * de dibujo.
 *
 * <p>La tabla se desplaza dentro de su caja. Son diez columnas: sin ese recuadro, en el móvil la página
 * entera se iba de lado y la cabecera del panel quedaba fuera.
 */
@Component({
  selector: 'nx-tabla-de-pedidos',
  imports: [RouterLink, FaIconComponent, InsigniaEstado],
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
                  (change)="seleccion().alternaTodos(identificadores())"
                  [attr.aria-label]="t('admin.categories.select_all')"
                />
              </th>
              <th class="px-4 py-2 font-medium">{{ t('admin.dashboard.col.number') }}</th>
              <th class="px-4 py-2 font-medium">{{ t('admin.dashboard.col.status') }}</th>
              <th class="px-4 py-2 font-medium">{{ t('admin.orders.col.customer') }}</th>
              <th class="px-4 py-2 font-medium">{{ t('admin.orders.col.shop') }}</th>
              <th class="px-4 py-2 font-medium">{{ t('admin.orders.col.supplier') }}</th>
              <th class="px-4 py-2 font-medium">{{ t('admin.orders.col.items') }}</th>
              <th class="px-4 py-2 font-medium text-right">{{ t('admin.dashboard.col.total') }}</th>
              <th class="px-4 py-2 font-medium">{{ t('admin.orders.col.placed') }}</th>
              <th class="px-4 py-2 font-medium w-72">{{ t('admin.orders.col.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            @for (fila of filas(); track fila.pedido.id) {
              @let pedido = fila.pedido;
              <tr
                class="border-t border-ink-100 hover:bg-ink-50/50"
                [class.bg-brand-50]="fila.destacado || seleccion().tiene(pedido.id)"
              >
                <td class="px-3 py-2 w-8">
                  <input
                    type="checkbox"
                    class="checkbox checkbox-xs"
                    [checked]="seleccion().tiene(pedido.id)"
                    (change)="seleccion().alterna(pedido.id)"
                    [attr.aria-label]="pedido.numero"
                  />
                </td>
                <td class="px-4 py-2 font-mono text-[12px]">
                  <a
                    [routerLink]="['/admin/orders', pedido.id]"
                    class="text-brand-700 hover:underline"
                    >{{ pedido.numero }}</a
                  >
                </td>
                <td class="px-4 py-2"><nx-insignia-estado [estado]="pedido.estado" /></td>
                <td class="px-4 py-2 text-[12px]">{{ pedido.emailCliente || '—' }}</td>
                <td class="px-4 py-2 text-[12px] text-ink-600">{{ pedido.tienda || '—' }}</td>
                <td class="px-4 py-2 text-[12px] text-ink-600">{{ pedido.proveedor || '—' }}</td>
                <td class="px-4 py-2">{{ pedido.articulos }}</td>
                <!-- El importe lo formatea el BACKEND: reconvertirlo aquí mostraba un céntimo menos
                     de lo cobrado, porque el cobro suma las líneas ya convertidas. -->
                <td class="px-4 py-2 text-right font-medium">{{ pedido.totalFormateado || '—' }}</td>
                <td class="px-4 py-2 text-[12px] text-ink-500">{{ pedido.realizadoEl || '—' }}</td>
                <td class="px-4 py-2">
                  <div class="flex gap-1 flex-wrap">
                    <a
                      [routerLink]="['/admin/orders', pedido.id]"
                      class="btn btn-outline btn-square text-[11px]"
                      [attr.aria-label]="t('admin.orders.actions.view')"
                      [title]="t('admin.orders.actions.view')"
                    >
                      <fa-icon [icon]="iconos.ver" />
                    </a>
                    @for (accion of fila.acciones; track accion) {
                      <button
                        type="button"
                        (click)="pide.emit({ pedido, accion })"
                        class="btn btn-outline btn-square text-[11px]"
                        [class.text-red-600]="accion === 'cancel'"
                        [attr.aria-label]="t('admin.orders.actions.' + accion)"
                        [title]="t('admin.orders.actions.' + accion)"
                      >
                        <fa-icon [icon]="iconos[accion]" />
                      </button>
                    }
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="10" class="px-4 py-10 text-center text-ink-500 text-[13px]">
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
export class TablaDePedidos {
  readonly pedidos = input.required<readonly Pedido[]>();
  readonly seleccion = input.required<Seleccion>();
  /** Identificador o número que llega por la dirección para resaltar una fila concreta. */
  readonly resaltado = input<string | null>(null);

  readonly pide = output<PeticionSobrePedido>();

  protected readonly t = inject(TraduccionService).t;

  protected readonly iconos = {
    ver: faEye,
    forward: faPaperPlane,
    ship: faTruck,
    deliver: faCircleCheck,
    refund: faRotateLeft,
    cancel: faBan,
  };

  protected readonly identificadores = computed(() => this.pedidos().map((p) => p.id));

  /**
   * Las filas con lo que se deduce de cada pedido ya resuelto.
   *
   * <p>Se resalta tanto por identificador como por número: quien enlaza aquí usa uno u otro. Antes
   * las dos cosas se preguntaban desde la plantilla, fila a fila y en cada repintado.
   */
  protected readonly filas = computed(() => {
    const buscado = this.resaltado();
    return this.pedidos().map((pedido) => ({
      pedido,
      acciones: accionesPermitidas(pedido.estado),
      destacado: !!buscado && (buscado === pedido.id || buscado === pedido.numero),
    }));
  });
  protected readonly todosMarcados = computed(() =>
    this.seleccion().todosMarcados(this.identificadores()),
  );

}
