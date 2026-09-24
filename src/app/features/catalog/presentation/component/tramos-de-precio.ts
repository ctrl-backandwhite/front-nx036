import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPencil } from '@fortawesome/free-solid-svg-icons';
import { FormField, form, min } from '@angular/forms/signals';
import { EnfocaAlAparecer } from '@ds/directive/enfoca-al-aparecer.directive';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { TramoDePrecio } from '../../domain/model/producto';

interface Escalon {
  readonly rango: string;
  readonly precio: string;
  readonly activo: boolean;
  /** La cantidad mínima identifica al tramo: es lo que viaja al guardar su recargo. */
  readonly cantidadMinima: number;
  /** Recargo propio en yuanes, o nada si hereda el del producto. */
  readonly recargoCny: number | null;
  readonly recargoMostrado: string;
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
  imports: [FormField, EnfocaAlAparecer, FaIconComponent],
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
              <div class="text-[13px] font-semibold">{{ escalon.precio }}</div>

              <!--
                El recargo de ESTE escalón, solo para quien administra. Va aquí y no únicamente en el
                panel porque se decide mirando la tabla: es donde se ve lo que cobra cada tramo.
              -->
              @if (puedeEditar()) {
                <div class="mt-1 pt-1 border-t border-base-300/70 text-[10px] flex items-center gap-1">
                  @if (editando() === escalon.cantidadMinima) {
                    <input
                      type="number"
                      step="0.01"
                      nxEnfocaAlAparecer
                      [formField]="formulario.importe"
                      (keydown.enter)="guarda(escalon)"
                      (keydown.escape)="editando.set(null)"
                      (blur)="editando.set(null)"
                      class="input input-xs w-16 text-right px-1"
                      [attr.aria-label]="t('pdp.tiers.surcharge') + ' ' + escalon.rango"
                    />
                  } @else {
                    <span class="opacity-60">{{ t('pdp.tiers.surcharge') }}</span>
                    <span class="font-medium">{{ escalon.recargoMostrado }}</span>
                    <button
                      type="button"
                      class="opacity-50 hover:opacity-100"
                      [title]="t('pdp.tiers.surcharge_hint')"
                      [attr.aria-label]="t('actions.edit') + ': ' + t('pdp.tiers.surcharge')"
                      (click)="empiezaEdicion(escalon)"
                    >
                      <fa-icon [icon]="iconoDeLapiz" class="text-[9px]" />
                    </button>
                  }
                </div>
              }
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
  /** Solo quien administra ve y toca el recargo de cada escalón. */
  readonly puedeEditar = input(false);

  /** Sale la cantidad mínima del tramo y su nuevo recargo; nulo = vuelve a heredar el del producto. */
  readonly cambiaRecargo = output<{ cantidadMinima: number; recargoCny: number | null }>();

  protected readonly t = inject(TraduccionService).t;
  protected readonly iconoDeLapiz = faPencil;

  /** Qué escalón se está editando, por su cantidad mínima. */
  protected readonly editando = signal<number | null>(null);

  private readonly borrador = signal<{ importe: number | null }>({ importe: 0 });

  /** Un recargo negativo restaría del precio, que es lo contrario de lo que es un recargo. */
  protected readonly formulario = form(this.borrador, (ruta) => {
    min(ruta.importe, 0, { message: () => this.t('dialog.field.min') });
  });

  protected empiezaEdicion(escalon: Escalon): void {
    this.borrador.set({ importe: escalon.recargoCny });
    this.editando.set(escalon.cantidadMinima);
  }

  /**
   * Guarda al pulsar Intro. Un campo vacío manda NULO —el tramo vuelve a heredar el del producto—,
   * que es distinto de un cero escrito a mano.
   */
  protected guarda(escalon: Escalon): void {
    const escrito = this.borrador().importe;
    this.editando.set(null);
    if (this.formulario().invalid()) {
      return;
    }
    const recargoCny = escrito === null || !Number.isFinite(escrito) ? null : escrito;
    if (recargoCny === escalon.recargoCny) {
      return;
    }
    this.cambiaRecargo.emit({ cantidadMinima: escalon.cantidadMinima, recargoCny });
  }

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
      cantidadMinima: tramo.cantidadMinima,
      recargoCny: tramo.recargoCny ?? null,
      // Sin recargo propio se dice que HEREDA, no se pinta un cero: son cosas distintas y confundirlas
      // haría creer que ese tramo no lleva cargo cuando sí lleva el del producto.
      recargoMostrado:
        tramo.recargoCny == null ? this.t('pdp.tiers.surcharge_inherits') : String(tramo.recargoCny),
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
