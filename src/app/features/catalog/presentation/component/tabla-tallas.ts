import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FormField, applyEach, disabled, form, max, min } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faMinus, faPlus } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PreferenciasService } from '@core/preferences/preferencias';
import { EjeDeVariante } from '../../domain/model/producto';
import { etiquetaDeValor, partesDeLaTalla } from '../../domain/model/seleccion-de-variante';

/** A partir de aquí se colapsa la lista: treinta tallas convierten la ficha en una columna infinita. */
const TOPE_ANTES_DE_COLAPSAR = 10;
export interface CambioDeTalla {
  readonly talla: string;
  readonly cantidad: number;
}

/**
 * Las tallas con sus existencias y cuántas unidades se lleva de cada una.
 *
 * <p>Una talla por FILA, como la ficha del proveedor. Antes era una rejilla de celdas, y con ella
 * venía todo un mecanismo para decidir si el producto necesitaba celdas anchas —«120*200cm Sábana
 * individual» no cabe donde cabe «XXL»—. En fila ese problema desaparece: el ancho es el de la ficha,
 * y encima queda sitio para el precio, que es lo que no entraba en la celda.
 */
@Component({
  selector: 'nx-tabla-tallas',
  imports: [FaIconComponent, FormField],
  template: `
    @if (valores().length > 0) {
      <div class="card card-border bg-base-100">
        <div class="card-body p-3">
          <div class="flex items-baseline justify-between mb-2 px-1">
            <h3 class="text-[13px] font-medium">{{ t('pdp.size') }}</h3>
            <span class="text-[11px] opacity-60">
              {{ valores().length }} · {{ t('pdp.size.stock') }}
            </span>
          </div>

          <!-- Una talla por FILA, como la ficha del proveedor: talla, lo que cuesta, lo que
               queda y cuántas se llevan. En rejilla, el precio no cabía sin romper la celda, y era
               justo el dato que obligaba a ir tocando tallas una por una para saber cuál valía
               cuánto. En fila entra todo y se compara de un vistazo, que es para lo que se mira. -->
          <div class="flex flex-col divide-y divide-base-200">
            @for (valor of visibles(); track valor.id) {
              @let etiqueta = etiquetaDe(valor);
              @let existencias = existenciasDe(etiqueta);
              @let cantidad = cantidadDe(etiqueta);
              @let importe = precio()(etiqueta);
              <div
                class="flex items-center gap-2 py-1.5 px-1 rounded-md transition-colors"
                [class]="
                  existencias <= 0
                    ? 'opacity-60'
                    : cantidad > 0
                      ? 'bg-primary/5'
                      : 'hover:bg-base-200/60'
                "
              >
                @let talla = partesDeLaTalla(etiqueta);
                <span class="flex-1 min-w-0 truncate flex items-center gap-1.5" [title]="etiqueta">
                  <span class="font-semibold text-[13px]">{{ talla.principal }}</span>
                  <!-- La equivalencia en letra va aparte: pegada al número («28(S)») se lee como un
                       código y no como una talla. -->
                  @if (talla.equivalencia) {
                    <span class="badge badge-sm">{{ talla.equivalencia }}</span>
                  }
                </span>

                @if (importe) {
                  <span class="text-[13px] shrink-0">{{ importe }}</span>
                }

                <span
                  class="text-[11px] shrink-0 w-20 text-right"
                  [class]="existencias <= 0 ? 'text-error' : 'opacity-60'"
                >
                  {{ existencias <= 0 ? t('product.out_of_stock') : tCon('pdp.size.left', { n: existencias }) }}
                </span>

                <div class="join shrink-0">
                  <button
                    type="button"
                    class="btn btn-xs join-item w-7 px-0"
                    [disabled]="existencias <= 0 || cantidad <= 0"
                    (click)="cambia.emit({ talla: etiqueta, cantidad: cantidad - 1 })"
                    [attr.aria-label]="t('common.prev')"
                  >
                    <fa-icon [icon]="iconos.menos" class="text-[10px]" />
                  </button>
                  <!-- Ni el mínimo, ni el tope de existencias, ni el bloqueo van en el marcado: los
                       declara el esquema del formulario, que es quien los conoce por talla. -->
                  <input
                    type="number"
                    [formField]="formulario[etiqueta]"
                    (change)="publica(etiqueta)"
                    class="input input-bordered input-xs join-item w-12 text-center px-1"
                    [attr.aria-label]="t('pdp.size') + ' ' + etiqueta"
                  />
                  <button
                    type="button"
                    class="btn btn-xs join-item w-7 px-0"
                    [disabled]="existencias <= 0 || cantidad >= existencias"
                    (click)="cambia.emit({ talla: etiqueta, cantidad: cantidad + 1 })"
                    [attr.aria-label]="t('common.next')"
                  >
                    <fa-icon [icon]="iconos.mas" class="text-[10px]" />
                  </button>
                </div>
              </div>
            }
          </div>

          @if (colapsable()) {
            <button
              type="button"
              (click)="desplegada.set(!desplegada())"
              class="btn btn-ghost btn-sm w-full mt-2 text-primary font-normal"
            >
              {{
                desplegada()
                  ? t('pdp.size.show_less')
                  : t('pdp.size.show_more') + ' (' + (valores().length - tope) + ')'
              }}
            </button>
          }
        </div>
      </div>
    }
  `,
})
export class TablaTallas {
  readonly eje = input.required<EjeDeVariante>();
  readonly unidades = input.required<Readonly<Record<string, number>>>();
  /** Cuántas quedan de esa talla en el color que se está mirando. El stock es por color Y talla. */
  readonly existencias = input.required<(talla: string) => number>();
  /**
   * Lo que cuesta esa talla en el color elegido. El precio cambia por variante —una 44 puede costar
   * más que una 38—, y la ficha de origen lo enseña en cada fila: sin él hay que ir tocando tallas
   * para descubrir cuál vale cuánto.
   */
  readonly precio = input<(talla: string) => string | undefined>(() => undefined);

  readonly cambia = output<CambioDeTalla>();

  private readonly preferencias = inject(PreferenciasService);
  /** Parte «28(S)» para pintar el número y la letra por separado. */
  protected readonly partesDeLaTalla = partesDeLaTalla;

  protected readonly t = inject(TraduccionService).t;
  /** Para el «quedan N»: los marcadores los coloca cada idioma donde le corresponde. */
  protected readonly tCon = inject(TraduccionService).tCon;
  protected readonly iconos = { menos: faMinus, mas: faPlus };
  protected readonly tope = TOPE_ANTES_DE_COLAPSAR;
  protected readonly desplegada = signal(false);

  protected readonly valores = computed(() => this.eje().valores);

  /**
   * Cuántas unidades lleva puestas cada talla, con TODAS las tallas presentes aunque vayan a cero.
   *
   * <p>Signal Forms construye un campo por cada clave que existe en el objeto: una talla sin clave
   * dejaría su casilla sin nada a lo que atarse. Se DERIVA de lo que manda el padre, así que cambiar
   * de color —que reajusta las unidades— vacía las casillas solo, sin sincronizar nada a mano.
   */
  private readonly cantidades = linkedSignal<Readonly<Record<string, number | null>>>(() =>
    Object.fromEntries(
      this.valores().map((valor) => {
        const talla = this.etiquetaDe(valor);
        return [talla, this.unidades()[talla] ?? 0];
      }),
    ),
  );

  /**
   * Las tres reglas de cada casilla, ahora dichas una sola vez para todas las tallas.
   *
   * <p>Antes estaban repartidas entre tres sitios que había que mantener a la par: un `min="0"` y un
   * `[max]` en el marcado, un `[disabled]` al lado, y un recorte a mano al teclear. El tope y el
   * bloqueo son POR TALLA, porque las existencias lo son: el mismo producto puede tener la S agotada
   * y la M con veinte.
   */
  protected readonly formulario = form(this.cantidades, (ruta) => {
    applyEach(ruta, (casilla) => {
      min(casilla, 0, { message: () => this.t('dialog.field.min') });
      max(casilla, ({ key }) => this.existenciasDe(key()));
      disabled(casilla, ({ key }) => this.existenciasDe(key()) <= 0);
    });
  });
  protected readonly colapsable = computed(() => this.valores().length > TOPE_ANTES_DE_COLAPSAR);
  protected readonly visibles = computed(() =>
    this.desplegada() || !this.colapsable()
      ? this.valores()
      : this.valores().slice(0, TOPE_ANTES_DE_COLAPSAR),
  );

  protected etiquetaDe(valor: EjeDeVariante['valores'][number]): string {
    return etiquetaDeValor(valor, this.preferencias.idioma());
  }

  protected existenciasDe(talla: string): number {
    return this.existencias()(talla);
  }

  protected cantidadDe(talla: string): number {
    return this.unidades()[talla] ?? 0;
  }

  /**
   * Lo tecleado sube al SALIR de la casilla, igual que antes: publicarlo por dígito haría que escribir
   * «12» pidiera primero una unidad y luego doce.
   *
   * <p>Se sigue recortando al stock aunque el formulario ya lo señale: quien manda sobre las unidades
   * es la selección de la ficha, y el aviso no puede convertirse en un pedido imposible.
   */
  protected publica(talla: string): void {
    const tecleado = this.cantidades()[talla];
    const cantidad = tecleado !== null && tecleado !== undefined && Number.isFinite(tecleado) ? tecleado : 0;
    this.cambia.emit({
      talla,
      cantidad: Math.min(this.existenciasDe(talla), Math.max(0, cantidad)),
    });
  }
}
