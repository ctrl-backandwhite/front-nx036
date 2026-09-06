import { Component, computed, inject, signal } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { SeriesDelPanel, ultimosDias, valoresDeLaSerie } from '../../../domain/gestion/model/panel';
import { ConsultaSeries } from '../../../application/gestion/use-case/panel.use-case';
import { ImportesStore } from '../../../application/gestion/state/importes.store';
import { GraficaBarras } from './grafica-barras';

/** Cuántos días se pintan. Treinta es el mes comercial: se compara con el anterior de un vistazo. */
const DIAS = 30;

/**
 * Pedidos y facturación por día, sobre datos reales del propio panel.
 *
 * <p>El eje se construye en el cliente: la serie llega como un diccionario CON HUECOS —los días sin
 * ventas no vienen— y pintar solo los días con datos mentiría sobre el ritmo, juntando dos semanas
 * flojas como si fueran seguidas.
 *
 * <p>MOBILE FIRST: una gráfica debajo de otra en el móvil, y dos columnas a partir de `md`.
 */
@Component({
  selector: 'nx-graficas-del-panel',
  imports: [GraficaBarras],
  template: `
    <section class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="card p-5">
        <div class="flex items-center justify-between">
          <h3 class="text-sm">{{ t('admin.dashboard.chart.orders') }}</h3>
          <span class="text-xs text-ink-500">
            {{ totalDePedidos() }} · {{ dias.length }}{{ t('admin.dashboard.chart.days') }}
          </span>
        </div>
        @if (cargando()) {
          <div class="h-24 mt-3 bg-base-200 rounded animate-pulse"></div>
        } @else {
          <div class="mt-3">
            <nx-grafica-barras [dias]="dias" [valores]="pedidos()" color="#0f66c9"
                               [descripcion]="t('admin.dashboard.chart.orders')" />
          </div>
        }
      </div>

      <div class="card p-5">
        <div class="flex items-center justify-between">
          <h3 class="text-sm">{{ t('admin.dashboard.chart.gmv') }}</h3>
          <span class="text-xs text-ink-500">
            {{ importes.escribe(totalDeGmv()) }} · {{ dias.length }}{{ t('admin.dashboard.chart.days') }}
          </span>
        </div>
        @if (cargando()) {
          <div class="h-24 mt-3 bg-base-200 rounded animate-pulse"></div>
        } @else {
          <div class="mt-3">
            <nx-grafica-barras [dias]="dias" [valores]="facturacion()" color="#10b981"
                               [formato]="formateaImporte" [descripcion]="t('admin.dashboard.chart.gmv')" />
          </div>
        }
      </div>
    </section>
  `,
})
export class GraficasDelPanel {
  protected readonly t = inject(TraduccionService).t;
  protected readonly importes = inject(ImportesStore);
  private readonly consulta = inject(ConsultaSeries);

  protected readonly dias = ultimosDias(DIAS);
  protected readonly cargando = signal(true);
  private readonly series = signal<SeriesDelPanel | null>(null);

  protected readonly pedidos = computed(() =>
    valoresDeLaSerie(this.dias, this.series()?.pedidosPorDia),
  );
  /** La facturación llega en céntimos: se pasa a unidades para que el eje y el rótulo hablen igual. */
  protected readonly facturacion = computed(() =>
    valoresDeLaSerie(this.dias, this.series()?.gmvCentimosPorDia, 100),
  );

  protected readonly totalDePedidos = computed(() =>
    this.pedidos().reduce((suma, valor) => suma + valor, 0),
  );
  protected readonly totalDeGmv = computed(() =>
    this.facturacion().reduce((suma, valor) => suma + valor, 0),
  );

  /** Se declara como campo y no en la plantilla: una función nueva por render reiniciaría la gráfica. */
  protected readonly formateaImporte = (valor: number): string => this.importes.escribe(valor);

  constructor() {
    void this.carga();
  }

  private async carga(): Promise<void> {
    const resultado = await this.consulta.ejecuta();
    if (resultado.ok) {
      this.series.set(resultado.valor);
    }
    // Con fallo también se deja de cargar: la gráfica se pinta a cero, que es honesto, en vez de girar
    // para siempre haciendo creer que el dato está a punto de llegar.
    this.cargando.set(false);
  }
}
