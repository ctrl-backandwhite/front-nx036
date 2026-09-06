import { Component, computed, inject, input, resource } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PreferenciasService } from '@core/preferences/preferencias';
import { ANALITICA_DE_PRODUCTO_PORT } from '../../domain/port/analitica-de-producto.port';
import { PuntoDeHistorico } from '../../domain/model/catalogo-auxiliar';
import { formateaImporte } from '../../domain/model/importe';

/** Ventana del histórico. Tres meses son suficientes para ver una tendencia sin ruido. */
const DIAS = 90;
const ANCHO = 600;
const ALTO = 160;
const MARGEN_X = 30;
const MARGEN_Y = 14;

/**
 * Cómo ha evolucionado el precio y el inventario.
 *
 * <p>Se dibuja el SVG a mano, sin ninguna librería de gráficos: son dos líneas y cuatro rótulos, y
 * arrastrar una dependencia entera para esto pesaría más que toda la ficha. Además el `viewBox` hace
 * que escale solo, que es justo lo que hace falta en el móvil.
 */
@Component({
  selector: 'nx-historico-de-precios',
  template: `
    @if (datos.isLoading()) {
      <div class="card p-5">
        <h3>{{ t('catalog.detail.history.title') }}</h3>
        <div class="skeleton mt-3 h-[160px] w-full"></div>
      </div>
    } @else if (puntos().length > 0) {
      <div class="card p-5">
        <div class="flex items-baseline justify-between mb-3">
          <h3 class="m-0!">{{ t('catalog.detail.history.title') }}</h3>
          <div class="text-[12px] text-ink-500">
            {{ primero() }} → {{ ultimo() }}
            <span class="ml-2" [class]="variacion() >= 0 ? 'text-emerald-700' : 'text-red-700'">
              {{ variacion() >= 0 ? '+' : '' }}{{ variacion().toFixed(1) }}%
            </span>
          </div>
        </div>
        <svg
          [attr.viewBox]="'0 0 ' + ancho + ' ' + alto"
          class="w-full"
          role="img"
          [attr.aria-label]="t('catalog.detail.history.title')"
        >
          <line [attr.x1]="margenX" [attr.y1]="margenY" [attr.x2]="margenX" [attr.y2]="alto - margenY" stroke="var(--color-ink-100)" />
          <line [attr.x1]="margenX" [attr.y1]="alto - margenY" [attr.x2]="ancho - margenX" [attr.y2]="alto - margenY" stroke="var(--color-ink-100)" />
          <path [attr.d]="trazoDeExistencias()" fill="none" stroke="var(--color-ink-300)" stroke-width="1" stroke-dasharray="3 3" />
          <path [attr.d]="trazoDePrecio()" fill="none" stroke="var(--color-brand-600)" stroke-width="1.8" />
        </svg>
        <div class="flex items-center gap-3 text-[11px] text-ink-500 mt-2">
          <span>
            <span class="inline-block w-3 h-[2px] bg-brand-600 align-middle mr-1"></span>
            {{ t('catalog.detail.history.price') }}
          </span>
          <span>
            <span class="inline-block w-3 h-[2px] bg-ink-300 align-middle mr-1"></span>
            {{ t('catalog.detail.history.stock') }}
          </span>
        </div>
      </div>
    }
  `,
})
export class HistoricoDePrecios {
  readonly idDelProducto = input.required<string>();

  private readonly puerto = inject(ANALITICA_DE_PRODUCTO_PORT);
  private readonly preferencias = inject(PreferenciasService);
  protected readonly t = inject(TraduccionService).t;

  protected readonly ancho = ANCHO;
  protected readonly alto = ALTO;
  protected readonly margenX = MARGEN_X;
  protected readonly margenY = MARGEN_Y;

  protected readonly datos = resource({
    params: () => ({ id: this.idDelProducto() }),
    loader: async ({ params }) => {
      const resultado = await this.puerto.historicoDePrecios(params.id, DIAS);
      return resultado.ok ? resultado.valor : [];
    },
  });

  protected readonly puntos = computed<readonly PuntoDeHistorico[]>(() => this.datos.value() ?? []);

  private readonly rango = computed(() => {
    const precios = this.puntos().map((p) => p.precio);
    const existencias = this.puntos().map((p) => p.existencias);
    return {
      minimo: Math.min(...precios),
      maximo: Math.max(...precios),
      maximoDeExistencias: Math.max(...existencias, 1),
    };
  });

  protected readonly primero = computed(() => this.importe(this.puntos()[0]?.precio ?? 0));
  protected readonly ultimo = computed(() =>
    this.importe(this.puntos().at(-1)?.precio ?? 0),
  );

  protected readonly variacion = computed(() => {
    const inicial = this.puntos()[0]?.precio ?? 0;
    const final = this.puntos().at(-1)?.precio ?? 0;
    return inicial > 0 ? ((final - inicial) / inicial) * 100 : 0;
  });

  protected readonly trazoDePrecio = computed(() =>
    this.trazo((punto) => this.yDelPrecio(punto.precio)),
  );
  protected readonly trazoDeExistencias = computed(() =>
    this.trazo((punto) => this.yDeExistencias(punto.existencias)),
  );

  private trazo(y: (punto: PuntoDeHistorico) => number): string {
    return this.puntos()
      .map((punto, i) => `${i === 0 ? 'M' : 'L'} ${this.x(i).toFixed(1)} ${y(punto).toFixed(1)}`)
      .join(' ');
  }

  private x(indice: number): number {
    const util = ANCHO - MARGEN_X * 2;
    return MARGEN_X + (indice / Math.max(1, this.puntos().length - 1)) * util;
  }

  /** Con todos los precios iguales el rango es cero: la línea va por el centro en vez de dividir por 0. */
  private yDelPrecio(valor: number): number {
    const util = ALTO - MARGEN_Y * 2;
    const { minimo, maximo } = this.rango();
    if (maximo === minimo) {
      return MARGEN_Y + util / 2;
    }
    return MARGEN_Y + util - ((valor - minimo) / (maximo - minimo)) * util;
  }

  private yDeExistencias(valor: number): number {
    const util = ALTO - MARGEN_Y * 2;
    return MARGEN_Y + util - (valor / this.rango().maximoDeExistencias) * util;
  }

  private importe(valor: number): string {
    return formateaImporte(valor, this.preferencias.moneda(), this.preferencias.idioma());
  }
}
