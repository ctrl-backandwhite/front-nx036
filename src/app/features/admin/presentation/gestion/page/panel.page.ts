import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBoxesStacked, faChartLine, faCircleCheck, faKey, faSackDollar, faShop, faTruck, faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { SesionActual } from '@core/auth/sesion-actual';
import {
  Metricas, PedidoReciente, porcentajeActivo, productosInactivos,
} from '../../../domain/gestion/model/panel';
import {
  ConsultaMetricas, ConsultaPedidosRecientes,
} from '../../../application/gestion/use-case/panel.use-case';
import { ImportesStore } from '../../../application/gestion/state/importes.store';
import { BloqueKpi } from '../component/bloque-kpi';
import { GraficasDelPanel } from '../component/graficas-del-panel';
import { InsigniaDeEstado } from '../component/insignia-de-estado';

/** Por encima de este porcentaje de catálogo publicado, la tendencia se lee como buena. */
const PUBLICADO_SANO = 80;

/**
 * El cuadro de mando del panel.
 *
 * <p>Espera a que la sesión esté RESUELTA antes de pedir nada: al arrancar en frío las peticiones
 * salían antes de que hubiera credenciales y volvían con un rechazo que se pintaba como «sin datos».
 *
 * <p>RENDIMIENTO: se difieren las GRÁFICAS, y solo ellas. Ahí sí hay algo que ahorrar —el componente
 * arrastra su biblioteca de dibujo— y quien entra a mirar las cifras de cabecera no la descarga.
 *
 * <p>Los últimos pedidos estaban diferidos también y ya no: no ahorraban nada. La afirmación de que
 * eran «dos peticiones más» era falsa, porque métricas y pedidos se piden juntos y en la misma tanda,
 * se baje o no se baje. Lo único que el diferido conseguía era un hueco gris donde van los pedidos.
 *
 * <p>MOBILE FIRST: los indicadores se apilan en el móvil (`stats-vertical`) y pasan a fila desde `sm`;
 * las tarjetas de facturación van a una columna y a dos desde `md`.
 */
@Component({
  selector: 'nx-panel-admin',
  imports: [RouterLink, FaIconComponent, BloqueKpi, GraficasDelPanel, InsigniaDeEstado],
  template: `
    <div class="space-y-6">
      <header>
        <h1>{{ t('admin.dashboard.title') }}</h1>
        <p class="text-sm text-ink-500 mt-1">{{ t('admin.dashboard.subtitle') }}</p>
      </header>

      <div class="stats stats-vertical sm:stats-horizontal shadow-pastel w-full bg-base-100">
        <nx-bloque-kpi [icono]="iconos.productos" tono="primary" [cargando]="cargando()"
                       [etiqueta]="t('admin.dashboard.kpi.total_products')" [valor]="metricas()?.productosTotales"
                       [tendencia]="tendenciaDeInactivos()" />
        <nx-bloque-kpi [icono]="iconos.activos" tono="success" [cargando]="cargando()"
                       [etiqueta]="t('admin.dashboard.kpi.active')" [valor]="metricas()?.productosActivos"
                       [tendencia]="tendenciaDePublicados()" [alAlza]="publicadoSano()" />
        <nx-bloque-kpi [icono]="iconos.pedidos" tono="info" [cargando]="cargando()"
                       [etiqueta]="t('admin.dashboard.kpi.orders')" [valor]="metricas()?.pedidos" />
        <nx-bloque-kpi [icono]="iconos.proveedores" tono="secondary" [cargando]="cargando()"
                       [etiqueta]="t('admin.dashboard.kpi.suppliers')" [valor]="metricas()?.proveedores" />
        <nx-bloque-kpi [icono]="iconos.usuarios" tono="accent" [cargando]="cargando()"
                       [etiqueta]="t('admin.dashboard.kpi.users')" [valor]="metricas()?.usuarios" />
        <nx-bloque-kpi [icono]="iconos.planes" tono="warning" [cargando]="cargando()"
                       [etiqueta]="t('admin.dashboard.kpi.active_plans')" [valor]="metricas()?.planesActivos" />
      </div>

      <section class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="card card-border bg-base-100">
          <div class="card-body">
            <div class="flex items-center gap-2 opacity-70 text-[12px]">
              <fa-icon [icon]="iconos.facturacion" /> {{ t('admin.dashboard.gmv') }}
            </div>
            <div class="text-3xl font-medium">{{ facturacion() }}</div>
            <!-- El importe canónico en dólares se enseña siempre: es el dato del backend, y sin él no
                 hay forma de saber si la diferencia con el de arriba es el cambio o un error. -->
            <div class="text-[11px] opacity-50">
              {{ t('admin.dashboard.gmv.canonical') }}: {{ metricas()?.gmvUsd ?? 0 }} USD
            </div>
          </div>
        </div>
        <div class="card card-border bg-base-100">
          <div class="card-body">
            <div class="flex items-center gap-2 opacity-70 text-[12px]">
              <fa-icon [icon]="iconos.recurrente" /> {{ t('admin.dashboard.mrr') }}
            </div>
            <div class="text-3xl font-medium">{{ recurrente() }}</div>
            <div class="text-[11px] opacity-50">
              {{ metricas()?.suscripciones ?? 0 }} {{ t('admin.dashboard.mrr.subs') }}
            </div>
          </div>
        </div>
      </section>

      <!--
        Las gráficas y los últimos pedidos quedan POR DEBAJO DEL PLIEGUE: se llega a ellos bajando. Se
        difieren hasta que asoman, así que ni su código ni sus dos peticiones compiten con las cifras de
        cabecera, que es lo que se mira al entrar. El hueco reservado evita que la página dé un salto
        cuando llegan.
      -->
      @defer (on viewport) {
        <nx-graficas-del-panel />
      } @placeholder {
        <!-- UN solo elemento raíz: es el que el disparador observa para saber cuándo se llega aquí.
             Con varios, Angular no sabe a cuál mirar y rechaza la plantilla. -->
        <section class="grid grid-cols-1 md:grid-cols-2 gap-4 h-36"></section>
      }

      <!-- SIN DIFERIR, al contrario que las gráficas de arriba. La diferencia está en QUÉ hay
           detrás: allí, un componente con su biblioteca de dibujo, que sí vale la pena no
           descargar si nadie baja. Aquí solo marcado, y los pedidos ya se han pedido al montar,
           junto con las métricas y en la misma tanda. Diferirlo no ahorraba ni una petición ni un
           kilobyte: solo dejaba un hueco gris donde van los últimos pedidos. -->
      <section class="card overflow-hidden">
        <div class="card-header"><span>{{ t('admin.dashboard.recent_orders') }}</span></div>
        <div class="overflow-x-auto">
          <table class="table table-zebra table-sm w-full">
            <thead class="bg-ink-50 text-ink-500 text-left text-[12px]">
              <tr>
                <th class="px-4 py-2 font-medium">{{ t('admin.dashboard.col.number') }}</th>
                <th class="px-4 py-2 font-medium">{{ t('admin.dashboard.col.status') }}</th>
                <th class="px-4 py-2 font-medium text-right">{{ t('admin.dashboard.col.total') }}</th>
                <th class="px-4 py-2 font-medium">{{ t('admin.dashboard.col.date') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (pedido of pedidos(); track pedido.id) {
                <tr class="border-t border-ink-100 hover:bg-ink-50/50">
                  <td class="px-4 py-2 font-mono text-[12px]">
                    <a [routerLink]="['/admin/orders']" [queryParams]="{ focus: pedido.id }"
                       class="text-brand-700 hover:underline">{{ pedido.numero }}</a>
                  </td>
                  <td class="px-4 py-2"><nx-insignia-de-estado [estado]="pedido.estado" /></td>
                  <td class="px-4 py-2 text-right font-medium">{{ total(pedido) }}</td>
                  <td class="px-4 py-2 text-ink-500 text-[12px]">{{ fecha(pedido) }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4" class="px-4 py-8 text-center text-ink-500 text-[13px]">
                    {{ t('admin.dashboard.empty') }}
                    <a routerLink="/admin/orders" class="text-brand-600 hover:underline">
                      {{ t('admin.dashboard.empty.cta') }}
                    </a>
                    {{ t('admin.dashboard.empty.suffix') }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
})
export class PanelPage {
  protected readonly t = inject(TraduccionService).t;
  protected readonly importes = inject(ImportesStore);
  private readonly sesion = inject(SesionActual);
  private readonly consultaMetricas = inject(ConsultaMetricas);
  private readonly consultaPedidos = inject(ConsultaPedidosRecientes);

  protected readonly iconos = {
    productos: faBoxesStacked, activos: faCircleCheck, pedidos: faTruck, proveedores: faShop,
    usuarios: faUsers, planes: faKey, facturacion: faSackDollar, recurrente: faChartLine,
  };

  protected readonly metricas = signal<Metricas | null>(null);
  protected readonly pedidos = signal<readonly PedidoReciente[]>([]);
  protected readonly cargando = signal(true);
  /** Para no volver a pedir si la sesión se republica —al guardar el perfil, por ejemplo—. */
  private pedido = false;

  protected readonly facturacion = computed(() => this.importes.escribe(this.metricas()?.gmvUsd));
  protected readonly recurrente = computed(() => this.importes.escribe(this.metricas()?.mrrUsd));

  protected readonly tendenciaDeInactivos = computed(() => {
    const m = this.metricas();
    if (!m?.productosTotales) {
      return undefined;
    }
    return `${productosInactivos(m.productosActivos, m.productosTotales)} ${this.t('admin.dashboard.kpi.inactive')}`;
  });

  private readonly publicado = computed(() => {
    const m = this.metricas();
    return m ? porcentajeActivo(m.productosActivos, m.productosTotales) : 0;
  });

  protected readonly tendenciaDePublicados = computed(() =>
    this.metricas()?.productosTotales ? `${this.publicado()}%` : undefined,
  );
  protected readonly publicadoSano = computed(() => this.publicado() >= PUBLICADO_SANO);

  constructor() {
    // Se espera a SABER quién mira, y se lee UNA vez. Pedir en el constructor sin más dejaba la pantalla
    // vacía para siempre al recargar en frío: las peticiones salían antes de que hubiera credencial, el
    // rechazo se pintaba como «sin datos» y nadie volvía a intentarlo cuando la sesión sí se resolvía.
    effect(() => {
      if (this.sesion.resuelta() && !this.pedido) {
        this.pedido = true;
        void this.carga();
      }
    });
  }

  protected total(pedido: PedidoReciente): string {
    return this.importes.escribeCentimos(pedido.totalCentimos, pedido.divisa);
  }

  protected fecha(pedido: PedidoReciente): string {
    return pedido.realizadoEl ? new Date(pedido.realizadoEl).toLocaleString() : '—';
  }

  private async carga(): Promise<void> {
    void this.importes.carga();
    const [metricas, pedidos] = await Promise.all([
      this.consultaMetricas.ejecuta(),
      this.consultaPedidos.ejecuta(),
    ]);
    if (metricas.ok) {
      this.metricas.set(metricas.valor);
    }
    if (pedidos.ok) {
      this.pedidos.set(pedidos.valor);
    }
    this.cargando.set(false);
  }
}
