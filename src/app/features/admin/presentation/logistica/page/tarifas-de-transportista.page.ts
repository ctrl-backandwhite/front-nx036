import { Component, computed, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faChevronDown,
  faChevronRight,
  faRotateRight,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { BarraFiltros } from '@ds/component/filtros/barra-filtros';
import { FiltroDesplegable } from '@ds/component/filtros/filtro-desplegable';
import { REGIONS } from '@shared/i18n/regions';
import {
  FILTRO_DE_TARIFAS_VACIO,
  FiltroDeTarifas,
  GrupoDeTarifas,
  TarifaDeTransportista,
  agrupaTarifas,
  canalesDe,
  cuantosFiltrosDeTarifas,
  paisesDe,
} from '../../../domain/logistica/model/tarifa-transportista';
import {
  ConsultaTarifasDeTransportista,
  RefrescaTarifasDeTransportista,
} from '../../../application/logistica/use-case/configura-logistica.use-case';

/**
 * Lo que cuesta cada canal del transportista en cada destino.
 *
 * <p>La tabla la mide sola un cron cada tres horas, así que lo normal es no tocar nada. Esta pantalla
 * existe para las tres veces en que sí hace falta: mirar qué se está cobrando, forzar una medición
 * cuando el transportista acaba de cambiar precios, y ver si el refresco sigue vivo.
 *
 * <p><b>Se agrupa por canal y destino, no una fila por tramo.</b> Un canal tiene más de treinta tramos
 * y enseñarlos sueltos llena la pantalla de filas casi iguales; lo que se quiere saber de un vistazo
 * es cuánto cobra ese canal a ese país, y el detalle solo cuando se abre uno.
 *
 * <p>Los importes van en yuanes, que es como tarifa el transportista. Pasarlos aquí a la divisa del
 * panel obligaría a hacer una cuenta con un tipo de cambio que no es de esta pantalla, y a la hora de
 * comparar con la factura del carrier lo que sirve es su propio número.
 */
@Component({
  selector: 'nx-tarifas-de-transportista-page',
  imports: [FaIconComponent, BarraFiltros, FiltroDesplegable],
  template: `
    <div class="space-y-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="text-xl font-semibold">{{ t('admin.carrier_rates.title') }}</h1>
          <p class="text-[13px] text-ink-500">{{ t('admin.carrier_rates.subtitle') }}</p>
        </div>
        <button
          type="button"
          class="btn btn-primary btn-sm"
          [disabled]="refrescando()"
          (click)="refrescaTodo()"
        >
          <fa-icon [icon]="iconos.refrescar" [class.animate-spin]="refrescando()" />
          {{ refrescando() ? t('admin.carrier_rates.refreshing') : t('admin.carrier_rates.refresh_all') }}
        </button>
      </div>

      <!-- El refresco completo son varios minutos: sin decirlo, quien lo pulsa cree que se ha colgado. -->
      @if (refrescando()) {
        <p class="text-[12px] text-ink-500">{{ t('admin.carrier_rates.refresh_takes_long') }}</p>
      }

      <nx-barra-filtros
        [activos]="cuantosFiltros()"
        [hayActivos]="cuantosFiltros() > 0"
        (limpia)="limpiaFiltros()"
      >
        <nx-filtro-desplegable
          [etiqueta]="t('admin.carrier_rates.col.country')"
          [valor]="filtro().pais"
          (valorChange)="cambia('pais', $event ?? '')"
          [opciones]="opcionesDePais()"
          [marcador]="t('filters.all')"
        />
        <nx-filtro-desplegable
          [etiqueta]="t('admin.carrier_rates.col.channel')"
          [valor]="filtro().canal"
          (valorChange)="cambia('canal', $event ?? '')"
          [opciones]="opcionesDeCanal()"
          [marcador]="t('filters.all')"
        />
        <label class="flex items-center gap-1.5 text-[12px] text-ink-600">
          <input type="checkbox" [checked]="filtro().soloViejas" (change)="alterna('soloViejas')" />
          {{ t('admin.carrier_rates.only_stale') }}
        </label>
        <label class="flex items-center gap-1.5 text-[12px] text-ink-600">
          <input
            type="checkbox"
            [checked]="filtro().soloDesviadas"
            (change)="alterna('soloDesviadas')"
          />
          {{ t('admin.carrier_rates.only_skewed') }}
        </label>
        <label class="flex items-center gap-1.5 text-[12px] text-ink-600">
          <input
            type="checkbox"
            [checked]="filtro().incluirInactivas"
            (change)="alterna('incluirInactivas')"
          />
          {{ t('admin.carrier_rates.include_inactive') }}
        </label>
        <span class="text-[11px] text-ink-400 md:ml-auto">
          {{ t('pagination.showing') }} <strong>{{ grupos().length }}</strong>
          · {{ tarifas().length }} {{ t('admin.carrier_rates.tramos') }}
        </span>
      </nx-barra-filtros>

      <!-- Una tarifa sin refrescar es indistinguible de una buena mirando el importe, así que se
           avisa arriba y no solo en la fila. -->
      @if (cuantasViejas() > 0) {
        <div class="card p-3 flex items-start gap-2 text-[13px] text-amber-700">
          <fa-icon [icon]="iconos.aviso" class="mt-0.5" />
          <span>{{ tCon('admin.carrier_rates.stale_warning', { n: cuantasViejas() }) }}</span>
        </div>
      }

      @if (cargando()) {
        <p class="text-sm text-ink-500">{{ t('common.loading') }}</p>
      } @else if (grupos().length === 0) {
        <div class="card p-8 text-center text-sm text-ink-500">
          {{ t('admin.carrier_rates.empty') }}
        </div>
      } @else {
        <div class="card overflow-x-auto">
          <table class="w-full text-left text-[13px]">
            <thead class="border-b border-ink-100 text-[11px] uppercase tracking-wider text-ink-400">
              <tr>
                <th class="px-4 py-2 font-medium">{{ t('admin.carrier_rates.col.country') }}</th>
                <th class="px-4 py-2 font-medium">{{ t('admin.carrier_rates.col.channel') }}</th>
                <th class="px-4 py-2 font-medium text-right">
                  {{ t('admin.carrier_rates.col.half_kilo') }}
                </th>
                <th class="px-4 py-2 font-medium">{{ t('admin.carrier_rates.col.eta') }}</th>
                <th class="px-4 py-2 font-medium">{{ t('admin.carrier_rates.col.step') }}</th>
                <th class="px-4 py-2 font-medium">{{ t('admin.carrier_rates.col.measured') }}</th>
                <th class="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              @for (grupo of grupos(); track grupo.pais + grupo.canal) {
                <tr class="border-b border-ink-50 hover:bg-ink-50/40">
                  <td class="px-4 py-2 whitespace-nowrap">{{ nombreDePais(grupo.pais) }}</td>
                  <td class="px-4 py-2">
                    <span class="font-medium">{{ grupo.canal }}</span>
                    @if (grupo.nombreCanal) {
                      <span class="block text-[11px] text-ink-400">{{ grupo.nombreCanal }}</span>
                    }
                  </td>
                  <td class="px-4 py-2 text-right font-medium whitespace-nowrap">
                    {{ yuanes(grupo.ejemplo500gRmb) }}
                  </td>
                  <td class="px-4 py-2 text-[12px] text-ink-500 whitespace-nowrap">
                    {{ grupo.diasMin }}–{{ grupo.diasMax }} {{ t('checkout.ship_days') }}
                  </td>
                  <td class="px-4 py-2 text-[12px] text-ink-500 whitespace-nowrap">
                    <!-- El escalón no es un detalle técnico: un canal que redondea a 100 g cobra lo
                         mismo por 110 que por 200, y saberlo explica un importe que si no parece mal. -->
                    @if (grupo.escalonGramos > 0) {
                      {{ grupo.escalonGramos }} g
                    } @else {
                      —
                    }
                  </td>
                  <td class="px-4 py-2 text-[12px] whitespace-nowrap"
                      [class.text-amber-600]="grupo.alguntramoViejo"
                      [class.text-ink-500]="!grupo.alguntramoViejo">
                    {{ fecha(grupo.medidoEn) || '—' }}
                  </td>
                  <td class="px-4 py-2">
                    <div class="flex items-center gap-1 justify-end">
                      <button
                        type="button"
                        class="btn btn-outline btn-xs"
                        [disabled]="refrescando()"
                        (click)="refrescaDestino(grupo.pais)"
                      >
                        <fa-icon [icon]="iconos.refrescar" />
                        {{ t('admin.carrier_rates.remeasure') }}
                      </button>
                      <button
                        type="button"
                        class="btn btn-ghost btn-xs"
                        [attr.aria-expanded]="abierto() === clave(grupo)"
                        (click)="alternaDetalle(grupo)"
                      >
                        <fa-icon
                          [icon]="abierto() === clave(grupo) ? iconos.abajo : iconos.derecha"
                        />
                        {{ grupo.tramos.length }} {{ t('admin.carrier_rates.tramos') }}
                      </button>
                    </div>
                  </td>
                </tr>

                @if (abierto() === clave(grupo)) {
                  <tr class="bg-ink-50/60">
                    <td colspan="7" class="px-4 py-3">
                      <table class="w-full text-left text-[12px]">
                        <thead class="text-[10px] uppercase tracking-wider text-ink-400">
                          <tr>
                            <th class="py-1 font-medium">{{ t('admin.carrier_rates.col.up_to') }}</th>
                            <th class="py-1 font-medium text-right">
                              {{ t('admin.carrier_rates.col.base') }}
                            </th>
                            <th class="py-1 font-medium text-right">
                              {{ t('admin.carrier_rates.col.per_kilo') }}
                            </th>
                            <th class="py-1 font-medium text-right">
                              {{ t('admin.carrier_rates.col.skew') }}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (tramo of grupo.tramos; track tramo.id) {
                            <tr>
                              <td class="py-1">{{ tramo.hastaGramos }} g</td>
                              <td class="py-1 text-right">{{ yuanes(tramo.registroRmb) }}</td>
                              <td class="py-1 text-right">{{ yuanes(tramo.precioRmbKg) }}</td>
                              <td
                                class="py-1 text-right"
                                [class.text-amber-600]="tramo.desvioRmb > 0"
                              >
                                {{ tramo.desvioRmb > 0 ? yuanes(tramo.desvioRmb) : '—' }}
                              </td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class TarifasDeTransportistaPage {
  private readonly consulta = inject(ConsultaTarifasDeTransportista);
  private readonly refresca = inject(RefrescaTarifasDeTransportista);
  private readonly avisos = inject(AvisosStore);
  private readonly dialogo = inject(DialogoStore);
  private readonly traduccion = inject(TraduccionService);

  protected readonly t = this.traduccion.t;
  protected readonly tCon = this.traduccion.tCon;
  protected readonly iconos = {
    refrescar: faRotateRight,
    aviso: faTriangleExclamation,
    abajo: faChevronDown,
    derecha: faChevronRight,
  };

  protected readonly tarifas = signal<readonly TarifaDeTransportista[]>([]);
  protected readonly filtro = signal<FiltroDeTarifas>(FILTRO_DE_TARIFAS_VACIO);
  protected readonly cargando = signal(true);
  protected readonly refrescando = signal(false);
  /** Qué grupo tiene el detalle de tramos abierto. Solo uno: con dos ya no se compara, se busca. */
  protected readonly abierto = signal<string | null>(null);

  protected readonly grupos = computed<readonly GrupoDeTarifas[]>(() =>
    agrupaTarifas(this.tarifas()),
  );
  protected readonly cuantosFiltros = computed(() => cuantosFiltrosDeTarifas(this.filtro()));
  protected readonly cuantasViejas = computed(() => this.tarifas().filter((t) => t.vieja).length);

  /**
   * Los destinos y canales de los desplegables salen de lo que HAY en la tabla, no de una lista
   * escrita a mano: si mañana se abre un destino nuevo aparece solo, y uno que se cierra desaparece.
   */
  protected readonly opcionesDePais = computed(() =>
    paisesDe(this.tarifas()).map((p) => ({ valor: p, etiqueta: this.nombreDePais(p) })),
  );
  protected readonly opcionesDeCanal = computed(() =>
    canalesDe(this.tarifas()).map((c) => ({ valor: c, etiqueta: c })),
  );

  constructor() {
    void this.carga();
  }

  protected nombreDePais(iso: string): string {
    return REGIONS.find((r) => r.countryCode === iso)?.countryLabel ?? iso;
  }

  /** En yuanes y con dos decimales, que es como los pasa el transportista. */
  protected yuanes(importe: number): string {
    return `¥${importe.toFixed(2)}`;
  }

  protected fecha(iso?: string): string {
    if (!iso) {
      return '';
    }
    const momento = new Date(iso);
    return Number.isNaN(momento.getTime())
      ? ''
      : momento.toLocaleString(this.traduccion.idioma(), {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
  }

  protected clave(grupo: GrupoDeTarifas): string {
    return `${grupo.pais}|${grupo.canal}`;
  }

  protected alternaDetalle(grupo: GrupoDeTarifas): void {
    const clave = this.clave(grupo);
    this.abierto.update((actual) => (actual === clave ? null : clave));
  }

  protected cambia(campo: 'pais' | 'canal', valor: string): void {
    this.filtro.update((f) => ({ ...f, [campo]: valor }));
    void this.carga();
  }

  protected alterna(campo: 'soloViejas' | 'soloDesviadas' | 'incluirInactivas'): void {
    this.filtro.update((f) => ({ ...f, [campo]: !f[campo] }));
    void this.carga();
  }

  protected limpiaFiltros(): void {
    this.filtro.set(FILTRO_DE_TARIFAS_VACIO);
    void this.carga();
  }

  protected async refrescaDestino(pais: string): Promise<void> {
    this.refrescando.set(true);
    try {
      const resultado = await this.refresca.unDestino(pais);
      if (!resultado.ok) {
        this.avisos.error(resultado.error.mensaje || this.t('common.error'));
        return;
      }
      this.avisos.exito(this.tCon('admin.carrier_rates.remeasured', { n: resultado.valor }));
      await this.carga();
    } finally {
      this.refrescando.set(false);
    }
  }

  /**
   * El barrido entero se confirma antes: son varios minutos de llamadas al transportista y quien lo
   * pulsa sin querer deja la pantalla ocupada sin saber por qué.
   */
  protected async refrescaTodo(): Promise<void> {
    const sigue = await this.dialogo.confirma(
      this.t('admin.carrier_rates.refresh_all_confirm'),
      this.t('admin.carrier_rates.refresh_all'),
    );
    if (!sigue) {
      return;
    }
    this.refrescando.set(true);
    try {
      const resultado = await this.refresca.todos();
      if (!resultado.ok) {
        this.avisos.error(resultado.error.mensaje || this.t('common.error'));
        return;
      }
      this.avisos.exito(this.tCon('admin.carrier_rates.remeasured', { n: resultado.valor }));
      await this.carga();
    } finally {
      this.refrescando.set(false);
    }
  }

  private async carga(): Promise<void> {
    this.cargando.set(true);
    try {
      const resultado = await this.consulta.ejecuta(this.filtro());
      if (!resultado.ok) {
        this.avisos.error(resultado.error.mensaje || this.t('common.error'));
        this.tarifas.set([]);
        return;
      }
      this.tarifas.set(resultado.valor);
    } finally {
      this.cargando.set(false);
    }
  }
}
