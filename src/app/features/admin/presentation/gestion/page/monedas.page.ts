import { Component, computed, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faCircleCheck, faCircleXmark, faCoins, faRotate,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { BarraFiltros } from '@ds/component/filtros/barra-filtros';
import { FiltroSeleccion, OpcionFiltro } from '@ds/component/filtros/filtro-seleccion';
import { CampoBusqueda } from '@ds/component/campo-busqueda/campo-busqueda';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { Divisa } from '../../../domain/gestion/model/dinero';
import { divisaCoincide, sinTasa, ultimaSincronizacion } from '../../../domain/gestion/model/sistema';
import {
  ConsultaDivisas, PublicaDivisas, SincronizaLasTasas,
} from '../../../application/gestion/use-case/sistema.use-case';

/**
 * El registro de divisas: tasas y qué se publica en el escaparate.
 *
 * <p>ACTIVAR está bloqueado si alguna divisa no tiene tipo de cambio. Sin tasa, la conversión devuelve
 * el importe SIN convertir y el comprador vería el número en dólares con el símbolo de su moneda —un
 * producto de 20 USD anunciado como «20 000 COP»—; como el cobro lo hace el backend, la tienda estaría
 * anunciando un precio que no es el que se cobra. DESACTIVAR no se bloquea nunca: es la salida de
 * emergencia si alguna llegó a publicarse.
 *
 * <p>El filtrado es LOCAL: son unas decenas de filas y no merece un viaje al servidor por cada letra.
 *
 * <p>RENDIMIENTO: la tabla va bajo el pliegue y se difiere con `on viewport`.
 *
 * <p>MOBILE FIRST: los filtros arrancan plegados en el móvil (lo resuelve `nx-barra-filtros`) y la
 * tabla se desplaza en horizontal dentro de su tarjeta.
 */
@Component({
  selector: 'nx-monedas-admin',
  imports: [FaIconComponent, BarraFiltros, FiltroSeleccion, CampoBusqueda],
  template: `
    @if (cargando()) {
      <p class="text-sm text-ink-500">{{ t('common.loading') }}</p>
    } @else {
      <div class="max-w-5xl mx-auto space-y-4">
        <header class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 class="flex items-center gap-2">
              <fa-icon [icon]="iconos.monedas" class="text-primary" /> {{ t('admin.currencies.title') }}
            </h1>
            <p class="text-sm text-ink-500 mt-1">{{ t('admin.currencies.subtitle') }}</p>
            @if (sincronizadaEl(); as fecha) {
              <p class="text-[11px] text-ink-400 mt-1">
                {{ t('admin.currencies.last_sync') }}: {{ fecha }}
              </p>
            }
          </div>
          <button type="button" (click)="sincroniza()" [disabled]="sincronizando()"
                  class="btn btn-primary text-[12px]">
            <fa-icon [icon]="iconos.sincronizar" [class.animate-spin]="sincronizando()" />
            {{ t('admin.currencies.sync') }}
          </button>
        </header>

        <nx-barra-filtros [activos]="filtrosPuestos()" [hayActivos]="filtrosPuestos() > 0"
                          (limpia)="limpiaFiltros()">
          <nx-campo-busqueda [(valor)]="texto" [marcador]="t('admin.currencies.search_ph')"
                             clase="w-full sm:min-w-[220px]" />
          <nx-filtro-seleccion [etiqueta]="t('orders.filter.status')" [(valor)]="estado"
                               [marcador]="t('orders.filter.all')" [opciones]="opcionesDeEstado()" />
          <span class="text-[11px] text-ink-400 ml-auto">
            {{ tCon('admin.currencies.active_count', { a: activas(), t: divisas().length }) }}
          </span>
        </nx-barra-filtros>

        @if (seleccionadas().size > 0) {
          <div class="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
            <span class="text-xs font-medium">
              {{ tCon('admin.currencies.selected', { n: seleccionadas().size }) }}
            </span>
            <button type="button" (click)="publicaLasMarcadas(true)" class="btn btn-success btn-xs">
              <fa-icon [icon]="iconos.activa" /> {{ t('admin.currencies.activate_selected') }}
            </button>
            <button type="button" (click)="publicaLasMarcadas(false)" class="btn btn-outline btn-xs">
              <fa-icon [icon]="iconos.inactiva" /> {{ t('admin.currencies.deactivate_selected') }}
            </button>
          </div>
        }

        <!-- RENDIMIENTO: la tabla va bajo la cabecera y los filtros; se difiere y se reserva el hueco. -->
        @defer (on viewport) {
        <div class="card overflow-x-auto">
          <table class="table table-zebra text-sm">
            <thead>
              <tr>
                <th class="w-8">
                  <input type="checkbox" class="checkbox checkbox-sm" [checked]="todasMarcadas()"
                         (change)="alternaTodas()" [attr.aria-label]="t('admin.categories.select_all')" />
                </th>
                <th>{{ t('admin.currencies.col.code') }}</th>
                <th>{{ t('admin.currencies.col.name') }}</th>
                <th class="text-right">{{ t('admin.currencies.col.rate') }}</th>
                <th>{{ t('admin.currencies.col.status') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (divisa of filtradas(); track divisa.codigo) {
                <tr>
                  <td>
                    <input type="checkbox" class="checkbox checkbox-sm" [checked]="marcada(divisa.codigo)"
                           (change)="alterna(divisa.codigo)" [attr.aria-label]="divisa.codigo" />
                  </td>
                  <td class="font-mono font-medium">
                    {{ divisa.banderaEmoji ? divisa.banderaEmoji + ' ' : '' }}{{ divisa.codigo }}
                    <span class="text-ink-400">{{ divisa.simbolo }}</span>
                  </td>
                  <td class="text-ink-600">{{ divisa.nombre }}</td>
                  <td class="text-right font-variant-numeric tabular-nums">
                    @if (rota(divisa)) {
                      <span class="text-warning">{{ rotuloSinTasa() }}</span>
                    } @else {
                      {{ divisa.tasaVsUsd }}
                    }
                  </td>
                  <td>
                    <button type="button" (click)="publica(divisa)"
                            class="badge cursor-pointer"
                            [class]="divisa.activa ? 'bg-emerald-100 text-emerald-700' : 'bg-ink-100 text-ink-500'"
                            [title]="t('admin.currencies.toggle_hint')">
                      <fa-icon [icon]="divisa.activa ? iconos.activa : iconos.inactiva" class="mr-1" />
                      {{ divisa.activa ? t('admin.currencies.active') : t('admin.currencies.inactive') }}
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        } @placeholder {
          <div class="card h-64"></div>
        }
      </div>
    }
  `,
})
export class MonedasPage {
  protected readonly t = inject(TraduccionService).t;
  protected readonly tCon = inject(TraduccionService).tCon;
  private readonly dialogo = inject(DialogoStore);
  private readonly consulta = inject(ConsultaDivisas);
  private readonly sincronizacion = inject(SincronizaLasTasas);
  private readonly publicacion = inject(PublicaDivisas);

  protected readonly iconos = {
    monedas: faCoins, sincronizar: faRotate, activa: faCircleCheck, inactiva: faCircleXmark,
  };

  protected readonly divisas = signal<readonly Divisa[]>([]);
  protected readonly cargando = signal(true);
  protected readonly sincronizando = signal(false);
  protected readonly seleccionadas = signal<ReadonlySet<string>>(new Set());

  protected readonly texto = signal('');
  protected readonly estado = signal<string | null>(null);

  protected readonly filtradas = computed(() =>
    this.divisas().filter((divisa) => divisaCoincide(divisa, this.texto(), this.estado())),
  );
  protected readonly activas = computed(() => this.divisas().filter((d) => d.activa).length);
  protected readonly sincronizadaEl = computed(() => {
    const marca = ultimaSincronizacion(this.divisas());
    return marca ? new Date(marca).toLocaleString() : '';
  });
  protected readonly filtrosPuestos = computed(
    () => (this.texto().trim() ? 1 : 0) + (this.estado() ? 1 : 0),
  );
  protected readonly opcionesDeEstado = computed<readonly OpcionFiltro[]>(() => [
    { value: 'active', label: this.t('admin.currencies.only_active') },
    { value: 'inactive', label: this.t('admin.currencies.only_inactive') },
  ]);
  protected readonly todasMarcadas = computed(() => {
    const filas = this.filtradas();
    const marcadas = this.seleccionadas();
    return filas.length > 0 && filas.every((divisa) => marcadas.has(divisa.codigo));
  });
  /** «sin tasa» todavía no está en los ocho diccionarios; se enseña el respaldo, no la clave. */
  protected readonly rotuloSinTasa = computed(() =>
    this.conRespaldo('admin.currencies.no_rate', 'sin tasa'),
  );

  constructor() {
    void this.carga();
  }

  protected rota(divisa: Divisa): boolean {
    return sinTasa(divisa);
  }

  protected marcada(codigo: string): boolean {
    return this.seleccionadas().has(codigo);
  }

  protected alterna(codigo: string): void {
    this.seleccionadas.update((previas) => {
      const siguientes = new Set(previas);
      if (!siguientes.delete(codigo)) {
        siguientes.add(codigo);
      }
      return siguientes;
    });
  }

  protected alternaTodas(): void {
    this.seleccionadas.set(
      this.todasMarcadas() ? new Set() : new Set(this.filtradas().map((d) => d.codigo)),
    );
  }

  protected limpiaFiltros(): void {
    this.texto.set('');
    this.estado.set(null);
  }

  protected async sincroniza(): Promise<void> {
    this.sincronizando.set(true);
    const resultado = await this.sincronizacion.ejecuta();
    this.sincronizando.set(false);
    if (!resultado.ok) {
      await this.dialogo.alerta(
        resultado.error.mensaje || this.t('admin.currencies.sync_error'), undefined, 'error',
      );
      return;
    }
    await this.carga();
    await this.dialogo.alerta(
      this.tCon('admin.currencies.sync_done', { n: resultado.valor }), undefined, 'success',
    );
  }

  protected publica(divisa: Divisa): Promise<void> {
    return this.aplica([divisa.codigo], !divisa.activa);
  }

  protected async publicaLasMarcadas(activa: boolean): Promise<void> {
    const codigos = [...this.seleccionadas()];
    if (!codigos.length) {
      return;
    }
    await this.aplica(codigos, activa);
  }

  /**
   * Publica o retira las divisas indicadas.
   *
   * <p>Quien decide si se puede es el caso de uso, no la pantalla: si alguna no tiene tasa devuelve un
   * rechazo con los códigos culpables y aquí solo se enseña. Repetir la comprobación en la pantalla es
   * cómo acaban divergiendo la regla y el aviso.
   */
  private async aplica(codigos: readonly string[], activa: boolean): Promise<void> {
    const resultado = await this.publicacion.ejecuta(codigos, activa, this.divisas());
    if (!resultado.ok) {
      const rotas = resultado.error.porCampo?.['divisas'];
      await this.dialogo.alerta(
        rotas
          ? this.conRespaldo(
              'admin.currencies.no_rate_block',
              'No se pueden activar divisas sin tipo de cambio: la tienda enseñaría precios en dólares'
                + ' con otro símbolo. Sincroniza las tasas primero.',
            ) + ' (' + rotas + ')'
          : resultado.error.mensaje || this.t('common.error'),
        undefined,
        'error',
      );
      return;
    }
    this.seleccionadas.set(new Set());
    await this.carga();
  }

  /** Respaldo para las claves que aún no están en los ocho diccionarios: `t()` devolvería la clave. */
  private conRespaldo(clave: string, respaldo: string): string {
    const traducido = this.t(clave);
    return traducido === clave ? respaldo : traducido;
  }

  private async carga(): Promise<void> {
    const resultado = await this.consulta.ejecuta();
    if (resultado.ok) {
      this.divisas.set(resultado.valor);
    }
    this.cargando.set(false);
  }
}
