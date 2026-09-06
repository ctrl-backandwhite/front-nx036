import { Component, computed, inject, input, resource, signal } from '@angular/core';
import { FieldTree, FormField, form, min, required } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChartLine, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PreferenciasService } from '@core/preferences/preferencias';
import { GuiaPuntos } from '@ds/component/guia-puntos/guia-puntos';
import { ANALITICA_DE_PRODUCTO_PORT } from '../../domain/port/analitica-de-producto.port';
import { MARGEN_BAJO } from '../../domain/model/catalogo-auxiliar';
import { formateaImporte } from '../../domain/model/importe';

/** Los destinos que se ofrecen para simular. Son los mercados donde hoy se vende. */
const PAISES = ['ES', 'US', 'MX', 'BR', 'GB', 'DE', 'FR', 'IT'];

/**
 * Cuánto se gana vendiendo este producto. SOLO para el administrador.
 *
 * <p>Los importes llegan ya en la moneda activa, con el tramo real y la regla de margen configurada:
 * aquí no se reconvierte nada. Y se avisa cuando el margen es bajo o NEGATIVO, que es el caso que de
 * verdad importa: se vendió a pérdida por no mirarlo.
 */
@Component({
  selector: 'nx-estimacion-de-margen',
  imports: [FaIconComponent, FormField, GuiaPuntos],
  template: `
    <div class="card p-5">
      <h3 class="m-0! flex items-center gap-2">
        <fa-icon [icon]="iconos.grafico" class="text-brand-500" />
        {{ t('catalog.detail.margin.title') }}
      </h3>

      <div class="mt-3 flex flex-wrap items-center gap-2 text-[12px]">
        <label for="margen-pais">
          <span class="text-ink-500 mr-1">{{ t('catalog.detail.margin.country') }}:</span>
        </label>
        <select id="margen-pais" class="select select-bordered select-sm" [formField]="formulario.pais">
          @for (codigo of paises; track codigo) {
            <option [value]="codigo">{{ codigo }}</option>
          }
        </select>
        <label for="margen-cantidad">
          <span class="text-ink-500 mr-1">{{ t('product.qty') }}:</span>
        </label>
        <!-- El mínimo ya no va como atributo del marcado: lo declara el esquema del formulario, que
             además es quien lo dice. El atributo solo limitaba las flechas del navegador. -->
        <input
          id="margen-cantidad"
          type="number"
          class="input input-bordered input-sm w-20"
          [formField]="formulario.cantidad"
        />
        @if (falloDe(formulario.cantidad); as fallo) {
          <span role="alert" class="text-xs text-error">{{ fallo }}</span>
        }
      </div>

      @if (datos.isLoading() || !datos.value()) {
        <div class="skeleton mt-3 h-24 w-full"></div>
      } @else if (datos.value(); as estimacion) {
        @if (estimacion.margenPorcentaje < 0) {
          <div
            role="alert"
            class="mt-3 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-[12px] text-red-700 flex items-start gap-2"
          >
            <fa-icon [icon]="iconos.aviso" class="mt-0.5" />
            <span>{{ t('catalog.detail.margin.warning_negative') }}</span>
          </div>
        } @else if (estimacion.margenPorcentaje < margenBajo) {
          <div
            role="alert"
            class="mt-3 px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-[12px] text-amber-800 flex items-start gap-2"
          >
            <fa-icon [icon]="iconos.aviso" class="mt-0.5" />
            <span>{{ t('catalog.detail.margin.warning_low') }}</span>
          </div>
        }

        <dl class="mt-4 text-[13px] flex flex-col gap-1.5">
          <div class="flex items-baseline">
            <dt class="text-ink-500">{{ t('catalog.detail.margin.suggested_retail') }}</dt>
            <nx-guia-puntos />
            <dd class="font-medium font-mono">{{ importe(estimacion.precioSugerido) }}</dd>
          </div>
          <div class="flex items-baseline">
            <dt class="text-ink-500">{{ t('catalog.detail.margin.cost') }}</dt>
            <nx-guia-puntos />
            <dd class="font-mono">−{{ importe(estimacion.coste) }}</dd>
          </div>
          <div class="flex items-baseline">
            <dt class="text-ink-500">{{ t('catalog.detail.margin.shipping') }}</dt>
            <nx-guia-puntos />
            <dd class="font-mono">−{{ importe(estimacion.envio) }}</dd>
          </div>
          <div class="flex items-baseline">
            <dt class="text-ink-500">{{ t('catalog.detail.margin.commission') }}</dt>
            <nx-guia-puntos />
            <dd class="font-mono">−{{ importe(estimacion.comision) }}</dd>
          </div>
          <div class="flex items-baseline border-t border-ink-100 pt-1 font-medium">
            <dt>{{ t('catalog.detail.margin.net_profit') }}</dt>
            <nx-guia-puntos />
            <dd class="font-mono" [class]="tono(estimacion.margenPorcentaje)">
              {{ importe(estimacion.beneficio) }}
            </dd>
          </div>
          <div class="flex items-baseline">
            <dt class="text-ink-500">{{ t('catalog.detail.margin.margin_pct') }}</dt>
            <nx-guia-puntos />
            <dd class="font-mono" [class]="tono(estimacion.margenPorcentaje)">
              {{ estimacion.margenPorcentaje.toFixed(1) }}%
            </dd>
          </div>
        </dl>

        <!-- Trazabilidad de lo que se usó para calcular: sin ella, un margen raro no se puede explicar. -->
        <div class="mt-3 text-[11px] text-ink-400 space-y-0.5">
          @if (estimacion.reglaAplicadaPorcentaje !== undefined) {
            <div>
              {{ t('catalog.detail.margin.applied_rule') }}:
              +{{ estimacion.reglaAplicadaPorcentaje.toFixed(0) }}%
            </div>
          }
          @if (estimacion.tramoAplicadoDesde !== undefined) {
            <div>
              {{ t('catalog.detail.margin.applied_tier') }}: ≥{{ estimacion.tramoAplicadoDesde }}
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class EstimacionDeMargen {
  readonly idDelProducto = input.required<string>();

  private readonly puerto = inject(ANALITICA_DE_PRODUCTO_PORT);
  private readonly preferencias = inject(PreferenciasService);
  protected readonly t = inject(TraduccionService).t;

  protected readonly iconos = { grafico: faChartLine, aviso: faTriangleExclamation };
  protected readonly paises = PAISES;
  protected readonly margenBajo = MARGEN_BAJO;

  /**
   * Lo que se simula. El país es SOLO un destino de simulación: no cambia el precio de nadie —eso lo
   * fija el país de registro de la cuenta—, y aquí no se calcula ningún importe: los pone el backend.
   */
  private readonly simulacion = signal<{ pais: string; cantidad: number | null }>({
    pais: 'ES',
    cantidad: 1,
  });

  /**
   * Las dos reglas de la simulación, ahora dichas en vez de corregidas por lo callado.
   *
   * <p>Antes el campo de cantidad se recortaba solo: quien escribía un cero veía saltar el número a
   * uno sin explicación, y el atributo `min` del marcado únicamente frenaba las flechas. Ahora el
   * formulario lo señala y el desglose sigue mostrándose con la última cantidad válida.
   */
  protected readonly formulario = form(this.simulacion, (ruta) => {
    required(ruta.pais, { message: () => this.t('dialog.field.required') });
    required(ruta.cantidad, { message: () => this.t('dialog.field.required') });
    min(ruta.cantidad, 1, { message: () => this.t('dialog.field.number') });
  });

  /**
   * Lo que de verdad se le pregunta al servidor. Pedir «cero unidades» solo gastaría una llamada para
   * devolver un desglose sin sentido, así que por debajo del mínimo se consulta con una unidad.
   */
  private readonly cantidadConsultada = computed(() => {
    const cantidad = this.simulacion().cantidad;
    return cantidad !== null && Number.isFinite(cantidad) && cantidad >= 1 ? cantidad : 1;
  });

  protected readonly datos = resource({
    params: () => ({
      id: this.idDelProducto(),
      pais: this.simulacion().pais,
      cantidad: this.cantidadConsultada(),
    }),
    loader: async ({ params }) => {
      const resultado = await this.puerto.estimacionDeMargen(params.id, params.pais, params.cantidad);
      return resultado.ok ? resultado.valor : null;
    },
  });

  private readonly divisa = computed(() => this.datos.value()?.divisa ?? this.preferencias.moneda());

  protected importe(valor: number): string {
    return formateaImporte(valor, this.divisa(), this.preferencias.idioma());
  }

  protected tono(margen: number): string {
    return margen < 0 ? 'text-red-700' : 'text-emerald-700';
  }

  /**
   * El mensaje que toca enseñar bajo un campo, o nulo. Se calla hasta que el campo se ha TOCADO: el
   * panel se abre con una unidad puesta y no tiene nada que reprochar a quien acaba de llegar.
   */
  protected falloDe<T>(campo: FieldTree<T>): string | null {
    const estado = campo();
    return estado.touched() ? (estado.errors()[0]?.message ?? null) : null;
  }
}
