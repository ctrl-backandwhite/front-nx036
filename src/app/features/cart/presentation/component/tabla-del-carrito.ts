import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBookmark, faMinus, faPlus, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { ImagenSegura } from '@ds/component/marcador/imagen-segura';
import { LineaDeCarrito, claveDeLinea, skuVisible } from '../../domain/model/linea-de-carrito';
import { VistaDeCotizacion } from '../../application/use-case/cotiza-el-carrito.use-case';
import { AccionesDeLinea } from '../acciones-de-linea';

/**
 * Las líneas de la cesta, en tabla.
 *
 * <p>MÓVIL PRIMERO: la columna del precio unitario aparece a partir de `sm`, porque en una pantalla
 * estrecha cinco columnas obligan a desplazarse en horizontal para ver el importe, que es justo el dato
 * que se ha venido a mirar. El total de la línea se queda siempre.
 *
 * <p>Los importes son los que escribe el servidor. Aquí no se multiplica cantidad por precio: el total de
 * la línea NO es esa multiplicación —el cálculo se hace en la divisa canónica y se convierte una sola vez
 * al final—, y escribirlo como producto invitaba a hacer una cuenta que no cuadra.
 */
@Component({
  selector: 'nx-tabla-del-carrito',
  imports: [RouterLink, FaIconComponent, ImagenSegura],
  template: `
    <div class="card overflow-hidden bg-base-100">
      <table class="table table-zebra table-sm">
        <thead class="bg-base-200 text-base-content/70 text-left text-[12px]">
          <tr>
            <th class="px-4 py-2 font-medium">{{ t('cart.col.product') }}</th>
            <th class="px-4 py-2 font-medium hidden sm:table-cell">{{ t('cart.col.price') }}</th>
            <th class="px-4 py-2 font-medium">{{ t('cart.col.qty') }}</th>
            <th class="px-4 py-2 font-medium">{{ t('cart.col.subtotal') }}</th>
            <th class="px-4 py-2 w-10"></th>
          </tr>
        </thead>
        <tbody>
          @for (linea of lineas(); track clave(linea)) {
            <tr>
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <nx-imagen-segura
                    [src]="linea.imagen"
                    [alt]="linea.titulo"
                    clase="w-12 h-12 rounded object-cover"
                  />
                  <div class="min-w-0">
                    <a
                      [routerLink]="['/catalog', linea.slug]"
                      class="text-sm font-medium hover:text-primary line-clamp-2"
                      >{{ linea.titulo }}</a
                    >
                    @if (linea.etiquetaDeVariante) {
                      <div class="text-[11px] opacity-70">{{ linea.etiquetaDeVariante }}</div>
                    }
                    <div class="text-[11px] opacity-60">
                      SKU: <code class="font-mono">{{ sku(linea) }}</code>
                    </div>
                    <!-- Peso NETO de la variante; si la ficha no lo declara se dice, no se rellena. -->
                    <div class="text-[11px] opacity-60">
                      {{ cotizacion().pesoDeLinea(linea) ?? t('cart.weight_pending') }}
                    </div>
                    <button
                      type="button"
                      class="text-[11px] text-primary hover:underline mt-1 inline-flex items-center gap-1 min-h-11 sm:min-h-0"
                      (click)="acciones.saca(linea, 'apartar')"
                    >
                      <fa-icon [icon]="iconoGuardar" /> {{ t('cart.save_for_later') }}
                    </button>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3 hidden sm:table-cell">{{ cotizacion().unitario(linea) }}</td>
              <td class="px-4 py-3">
                <!-- Los botones de cantidad solo llevan un icono: sin nombre accesible, quien navega con
                     lector de pantalla oye «botón, botón» y no puede cambiar lo que compra. -->
                <div class="join">
                  <button
                    type="button"
                    class="btn btn-xs join-item"
                    [attr.aria-label]="t('cart.qty.decrease')"
                    (click)="acciones.bajaUna(linea)"
                  >
                    <fa-icon [icon]="iconoMenos" />
                  </button>
                  <span class="btn btn-xs join-item no-animation pointer-events-none">{{
                    linea.cantidad
                  }}</span>
                  <button
                    type="button"
                    class="btn btn-xs join-item"
                    [attr.aria-label]="t('cart.qty.increase')"
                    (click)="acciones.subeUna(linea)"
                  >
                    <fa-icon [icon]="iconoMas" />
                  </button>
                </div>
              </td>
              <td class="px-4 py-3 font-medium">{{ cotizacion().totalDeLinea(linea) }}</td>
              <td class="px-4 py-3">
                <button
                  type="button"
                  class="btn btn-ghost btn-xs btn-square text-error"
                  [attr.aria-label]="t('cart.remove')"
                  (click)="acciones.saca(linea, 'quitar')"
                >
                  <fa-icon [icon]="iconoBorrar" />
                </button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class TablaDelCarrito {
  readonly lineas = input.required<readonly LineaDeCarrito[]>();
  readonly cotizacion = input.required<VistaDeCotizacion>();

  protected readonly acciones = inject(AccionesDeLinea);
  protected readonly t = inject(TraduccionService).t;

  protected readonly iconoGuardar = faBookmark;
  protected readonly iconoMenos = faMinus;
  protected readonly iconoMas = faPlus;
  protected readonly iconoBorrar = faTrashCan;

  protected readonly clave = claveDeLinea;
  protected readonly sku = skuVisible;
}
