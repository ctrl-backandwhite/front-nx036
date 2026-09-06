import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBookmark, faCartArrowDown, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { ImagenSegura } from '@ds/component/marcador/imagen-segura';
import { LineaDeCarrito, claveDeLinea } from '../../domain/model/linea-de-carrito';
import { VistaDeCotizacion } from '../../application/use-case/cotiza-el-carrito.use-case';
import { AccionesDeLinea } from '../acciones-de-linea';

/**
 * «Guardado para más tarde»: lo apartado de la cesta, que no se cobra hasta volver a moverlo.
 *
 * <p>El rótulo de la derecha dice DÓNDE está guardado. Sin sesión vive solo en este navegador, y quien no
 * lo sepa da por perdida la lista al cambiar de equipo — o peor, cuenta con ella y no está.
 */
@Component({
  selector: 'nx-lista-guardada',
  imports: [RouterLink, FaIconComponent, ImagenSegura],
  template: `
    <div class="card overflow-hidden bg-base-100">
      <div
        class="px-4 pt-3 pb-1 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
      >
        <h2 class="text-sm font-medium flex items-center gap-2">
          <fa-icon [icon]="iconoGuardar" class="text-primary" />
          {{ t('cart.saved_title') }}
          <span class="text-[12px] opacity-60 font-normal">({{ lineas().length }})</span>
        </h2>
        <span class="text-[11px] opacity-60">
          {{ enLaCuenta() ? t('cart.saved_hint_account') : t('cart.saved_hint_guest') }}
        </span>
      </div>
      <table class="table table-sm">
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
                      {{ cotizacion().unitario(linea) }} · {{ t('cart.col.qty') }}:
                      {{ linea.cantidad }}
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3 text-right whitespace-nowrap">
                <button
                  type="button"
                  class="btn btn-outline btn-xs gap-1"
                  (click)="acciones.devuelveALaCesta(linea)"
                >
                  <fa-icon [icon]="iconoDevolver" /> {{ t('cart.move_to_cart') }}
                </button>
                <button
                  type="button"
                  class="btn btn-ghost btn-xs btn-square text-error ml-1"
                  [attr.aria-label]="t('cart.remove')"
                  (click)="acciones.eliminaGuardada(linea)"
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
export class ListaGuardada {
  readonly lineas = input.required<readonly LineaDeCarrito[]>();
  readonly cotizacion = input.required<VistaDeCotizacion>();
  readonly enLaCuenta = input.required<boolean>();

  protected readonly acciones = inject(AccionesDeLinea);
  protected readonly t = inject(TraduccionService).t;

  protected readonly iconoGuardar = faBookmark;
  protected readonly iconoDevolver = faCartArrowDown;
  protected readonly iconoBorrar = faTrashCan;

  protected readonly clave = claveDeLinea;
}
