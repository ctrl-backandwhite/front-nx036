import { Component, inject, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { ImagenSegura } from '@ds/component/marcador/imagen-segura';
import { LineaDeCarrito, claveDeLinea } from '@features/cart/domain/model/linea-de-carrito';
import { VistaDeValoracion } from '../../application/use-case/valora-la-compra.use-case';

/**
 * Lo que se va a comprar, con sus cantidades.
 *
 * <p>Las cantidades y el borrado están AQUÍ, no solo en la cesta. Cuando el pedido supera el límite de
 * importación del destino, el aviso pide reducirlo — y hasta ahora había que salir del pago para poder
 * hacerlo. Pedir una acción en la pantalla donde no se puede ejecutar es la peor forma de bloquear una
 * compra.
 *
 * <p>El importe se escribe «0,14 € /ud» y NO «100 × 0,14 €»: el total de la línea ya no es esa
 * multiplicación —el cálculo se hace en la divisa canónica y se convierte una sola vez al final, así que
 * cien por 0,14 € daría 14,00 € cuando lo correcto son 13,80 €—. Escribirlo como producto invitaba a hacer
 * una cuenta que no cuadra.
 */
@Component({
  selector: 'nx-lineas-de-la-compra',
  imports: [FaIconComponent, ImagenSegura],
  template: `
    <section class="card p-5 space-y-3">
      <h3>{{ t('checkout.products') }} ({{ lineas().length }})</h3>
      <ul class="divide-y divide-ink-100 text-sm">
        @if (aviso()) {
          <li
            role="alert"
            class="mb-2 rounded border border-warning/40 bg-warning/10 p-2 text-[12px] text-warning-content/90"
          >
            <div class="flex items-start justify-between gap-2">
              <span>{{ aviso() }}</span>
              <button
                type="button"
                class="shrink-0 opacity-60 hover:opacity-100"
                [attr.aria-label]="t('common.close')"
                (click)="descartaAviso.emit()"
              >
                ×
              </button>
            </div>
          </li>
        }
        @for (linea of lineas(); track clave(linea)) {
          <li class="py-3 flex gap-3">
            <nx-imagen-segura
              [src]="linea.imagen"
              [alt]="linea.titulo"
              clase="w-14 h-14 object-cover rounded"
              claseMarcador="w-14 h-14 rounded"
            />
            <div class="flex-1 min-w-0">
              <div class="font-medium line-clamp-1">{{ linea.titulo }}</div>
              @if (linea.etiquetaDeVariante) {
                <div class="text-xs text-ink-500">{{ linea.etiquetaDeVariante }}</div>
              }
              <div class="text-xs text-ink-500">{{ valoracion().unitario(aItem(linea)) }} /ud</div>
              <div class="mt-1 flex items-center gap-1.5">
                <button
                  type="button"
                  class="btn btn-xs btn-ghost px-1.5 disabled:opacity-40"
                  [attr.aria-label]="t('cart.qty.decrease')"
                  [disabled]="!puedeBajar(linea)"
                  (click)="baja.emit(linea)"
                >
                  −
                </button>
                <span class="min-w-6 text-center text-xs tabular-nums">{{ linea.cantidad }}</span>
                <button
                  type="button"
                  class="btn btn-xs btn-ghost px-1.5"
                  [attr.aria-label]="t('cart.qty.increase')"
                  (click)="sube.emit(linea)"
                >
                  +
                </button>
                <button
                  type="button"
                  class="btn btn-xs btn-ghost px-1.5 text-error/70 hover:text-error"
                  [attr.aria-label]="t('cart.remove')"
                  [title]="t('cart.remove')"
                  (click)="quita.emit(linea)"
                >
                  <fa-icon [icon]="iconoBorrar" class="text-[11px]" />
                </button>
              </div>
            </div>
            <div class="text-sm font-medium">{{ valoracion().totalDeLinea(aItem(linea)) }}</div>
          </li>
        }
      </ul>
      <div class="pt-2">
        <label class="text-xs text-ink-500" for="notas-del-pedido">{{ t('checkout.notes') }}</label>
        <textarea
          id="notas-del-pedido"
          class="input mt-1 w-full text-sm"
          rows="2"
          [placeholder]="t('checkout.notes_placeholder')"
          [value]="notas()"
          (input)="escribeNotas.emit($any($event.target).value)"
        ></textarea>
      </div>
    </section>
  `,
})
export class LineasDeLaCompra {
  readonly lineas = input.required<readonly LineaDeCarrito[]>();
  readonly valoracion = input.required<VistaDeValoracion>();
  readonly notas = input.required<string>();
  readonly aviso = input<string | null>(null);
  /** Decide el DOMINIO de la cesta (pedido mínimo); aquí solo se pinta apagado. */
  readonly sePuedeBajar = input.required<(linea: LineaDeCarrito) => boolean>();

  readonly baja = output<LineaDeCarrito>();
  readonly sube = output<LineaDeCarrito>();
  readonly quita = output<LineaDeCarrito>();
  readonly escribeNotas = output<string>();
  readonly descartaAviso = output<void>();

  protected readonly t = inject(TraduccionService).t;
  protected readonly iconoBorrar = faTrashCan;
  protected readonly clave = claveDeLinea;

  protected puedeBajar(linea: LineaDeCarrito): boolean {
    return this.sePuedeBajar()(linea);
  }

  protected aItem(linea: LineaDeCarrito) {
    return { productId: linea.productId, variantId: linea.variantId, cantidad: linea.cantidad };
  }
}
