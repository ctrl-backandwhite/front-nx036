import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faMinus, faPlus } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PreferenciasService } from '@core/preferences/preferencias';
import { EjeDeVariante } from '../../domain/model/producto';
import { etiquetaDeValor } from '../../domain/model/seleccion-de-variante';

/** A partir de aquí se colapsa la lista: treinta tallas convierten la ficha en una columna infinita. */
const TOPE_ANTES_DE_COLAPSAR = 10;
/**
 * A partir de cuántos caracteres la rejilla pasa a celdas anchas. El umbral está medido sobre el
 * catálogo: deja fuera las tallas usuales (S, XXL, 110 cm) y captura las que llegan descritas.
 */
const LARGO_QUE_PIDE_ANCHO = 14;

export interface CambioDeTalla {
  readonly talla: string;
  readonly cantidad: number;
}

/**
 * Las tallas con sus existencias y cuántas unidades se lleva de cada una.
 *
 * <p>La rejilla se decide POR PRODUCTO, no por talla: o todas anchas o todas estrechas. Mezclar anchos
 * en la misma rejilla deja filas descuadradas —«90*190cm» estrecha junto a «120*200cm Sábana
 * individual» ancha— y se ve peor que el texto apilado que se quería arreglar. Basta con que UNA talla
 * necesite sitio para que todas lo tengan.
 */
@Component({
  selector: 'nx-tabla-tallas',
  imports: [FaIconComponent],
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

          <!-- Rejilla en unidades FINAS (el doble de columnas que celdas normales) para que una talla
               pueda ocupar dos columnas y media cuando el texto lo pide. -->
          <div class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 xl:grid-cols-10 gap-2 items-start">
            @for (valor of visibles(); track valor.id) {
              @let etiqueta = etiquetaDe(valor);
              @let existencias = existenciasDe(etiqueta);
              @let cantidad = cantidadDe(etiqueta);
              <div
                class="border rounded-lg p-2 overflow-hidden transition-colors"
                [class]="
                  (anchas() ? 'col-span-4 sm:col-span-5 md:col-span-5 xl:col-span-5 ' : 'col-span-2 ') +
                  (existencias <= 0
                    ? 'border-base-300 opacity-60'
                    : cantidad > 0
                      ? 'border-primary bg-primary/5'
                      : 'border-base-content/40 hover:border-base-content/60')
                "
              >
                <!-- En las anchas, etiqueta y controles van EN LÍNEA: apilados, el ancho extra se
                     desperdiciaría en blanco y la celda quedaría igual de alta que antes. -->
                <div [class]="anchas() ? 'flex items-center gap-2' : ''">
                  <div
                    class="flex items-baseline justify-between gap-2"
                    [class]="anchas() ? 'flex-1 min-w-0' : 'mb-1'"
                  >
                    <span class="font-semibold text-[13px]" [class.leading-snug]="anchas()">
                      {{ etiqueta }}
                    </span>
                    <span
                      class="text-[10px] shrink-0"
                      [class]="existencias <= 0 ? 'text-error' : 'opacity-60'"
                    >
                      {{ existencias <= 0 ? t('product.out_of_stock') : existencias }}
                    </span>
                  </div>
                  <div class="join max-w-full" [class]="anchas() ? 'w-auto shrink-0' : 'w-full'">
                    <button
                      type="button"
                      class="btn btn-xs join-item w-7 shrink-0 px-0"
                      [disabled]="existencias <= 0 || cantidad <= 0"
                      (click)="cambia.emit({ talla: etiqueta, cantidad: cantidad - 1 })"
                      [attr.aria-label]="t('common.prev')"
                    >
                      <fa-icon [icon]="iconos.menos" class="text-[10px]" />
                    </button>
                    <input
                      type="number"
                      min="0"
                      [max]="existencias"
                      [value]="cantidad"
                      [disabled]="existencias <= 0"
                      (change)="teclea(etiqueta, existencias, $event)"
                      class="input input-bordered input-xs join-item min-w-0 text-center font-mono px-1"
                      [class]="anchas() ? 'w-12' : 'flex-1 w-full'"
                      [attr.aria-label]="t('pdp.size') + ' ' + etiqueta"
                    />
                    <button
                      type="button"
                      class="btn btn-xs join-item w-7 shrink-0 px-0"
                      [disabled]="existencias <= 0 || cantidad >= existencias"
                      (click)="cambia.emit({ talla: etiqueta, cantidad: cantidad + 1 })"
                      [attr.aria-label]="t('common.next')"
                    >
                      <fa-icon [icon]="iconos.mas" class="text-[10px]" />
                    </button>
                  </div>
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

  readonly cambia = output<CambioDeTalla>();

  private readonly preferencias = inject(PreferenciasService);
  protected readonly t = inject(TraduccionService).t;
  protected readonly iconos = { menos: faMinus, mas: faPlus };
  protected readonly tope = TOPE_ANTES_DE_COLAPSAR;
  protected readonly desplegada = signal(false);

  protected readonly valores = computed(() => this.eje().valores);
  protected readonly colapsable = computed(() => this.valores().length > TOPE_ANTES_DE_COLAPSAR);
  protected readonly visibles = computed(() =>
    this.desplegada() || !this.colapsable()
      ? this.valores()
      : this.valores().slice(0, TOPE_ANTES_DE_COLAPSAR),
  );

  /**
   * Se mira sobre TODAS las tallas, no solo las visibles: si no, pulsar «ver más» recolocaría la
   * rejilla entera delante de quien está eligiendo.
   */
  protected readonly anchas = computed(() =>
    this.valores().some((valor) => this.etiquetaDe(valor).length > LARGO_QUE_PIDE_ANCHO),
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

  protected teclea(talla: string, existencias: number, evento: Event): void {
    const tecleado = Number((evento.target as HTMLInputElement).value);
    this.cambia.emit({
      talla,
      cantidad: Math.min(existencias, Math.max(0, Number.isFinite(tecleado) ? tecleado : 0)),
    });
  }
}
