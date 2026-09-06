import { Component, computed, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBan, faCircleCheck, faClockRotateLeft, faGear, faMoneyBillTransfer, faRotateRight,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import {
  Afiliado, ConfiguracionDeAfiliados, ESTADOS_DE_AFILIADO, PagoPendiente, tasaDeConversion,
} from '../../../domain/gestion/model/afiliados';
import { paginasAlMenosUna } from '../../../domain/gestion/model/pagina';
import {
  ApruebaComisionesVencidas, BuscaAfiliados, CambiaElEstadoDelAfiliado,
  ConsultaLaConfiguracionDeAfiliados, ConsultaPagosPendientes, PagaAlAfiliado, ReindexaAfiliados,
} from '../../../application/gestion/use-case/afiliados.use-case';
import { ImportesStore } from '../../../application/gestion/state/importes.store';
import { Paginacion } from '../component/paginacion';
import { AfiliadosConfiguracion } from '../component/afiliados-configuracion';
import { AfiliadosDetalle } from '../component/afiliados-detalle';
import { AfiliadosPagos } from '../component/afiliados-pagos';

/** Cuántos afiliados por página. El mismo número que pide el panel de React. */
const TAMANO = 20;

/**
 * El color de cada estado de afiliado.
 *
 * <p>No se reutiliza `nx-insignia-de-estado`: aquel es el vocabulario de los PEDIDOS —sus claves son
 * `orders.status.*`— y un afiliado «suspendido» no existe allí. Mezclarlos haría que el mismo código de
 * estado significara dos cosas según la tabla.
 */
const COLORES: Readonly<Record<string, string>> = {
  ACTIVE: 'badge-success',
  PENDING: 'badge-warning',
  SUSPENDED: 'badge-ghost',
};

/**
 * El programa de afiliados: quién trae ventas, cuánto se le debe y qué se le ha pagado.
 *
 * <p>La divisa de TODOS los importes es la del programa (`config.divisa`), no la activa del panel: el
 * pago se hace en esa divisa y convertirlo para pintarlo daría una cifra que no coincide con la
 * transferencia.
 *
 * <p>MOBILE FIRST: la cabecera y sus botones se pliegan (`flex-wrap`) y las tablas se desplazan dentro
 * de su propio contenedor, que es lo único que evita que la página entera se mueva de lado.
 */
@Component({
  selector: 'nx-afiliados-admin',
  imports: [FaIconComponent, Paginacion, AfiliadosPagos, AfiliadosConfiguracion, AfiliadosDetalle],
  template: `
    <div class="space-y-5">
      <header class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>{{ t('admin.affiliates.title') }}</h1>
          <p class="text-sm text-ink-500 mt-1">{{ t('admin.affiliates.subtitle') }}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <!-- Filtro por estado: para encontrar rápido las SOLICITUDES pendientes de aprobar. -->
          <label class="sr-only" for="afiliados-estado">{{ t('admin.affiliates.col.status') }}</label>
          <select id="afiliados-estado" class="select select-sm text-[12px]"
                  (change)="filtra($event)">
            <!-- La opción marcada se dice con «selected» y no asociando el valor del «select»: el valor se
                 asigna antes de que existan las opciones y la elección se perdía al recargar. -->
            <option value="" [selected]="estado() === ''">
              {{ t('admin.affiliates.status.all') }}
            </option>
            @for (opcion of estados; track opcion) {
              <option [value]="opcion" [selected]="estado() === opcion">
                {{ t('admin.affiliates.status.' + opcion) }}
              </option>
            }
          </select>
          <button type="button" class="btn btn-outline btn-sm text-[12px]" [disabled]="reindexando()"
                  [attr.title]="t('admin.reindex')" (click)="reindexa()">
            <fa-icon [icon]="iconos.reindexar" [animation]="reindexando() ? 'spin' : undefined" />
            {{ t('admin.reindex') }}
          </button>
          <button type="button" class="btn btn-outline btn-sm text-[12px]" [disabled]="aprobando()"
                  (click)="apruebaVencidas()">
            <fa-icon [icon]="iconos.vencidas" /> {{ t('admin.affiliates.approve_due') }}
          </button>
          <button type="button" class="btn btn-outline btn-sm text-[12px]"
                  (click)="configAbierta.set(true)">
            <fa-icon [icon]="iconos.ajustes" /> {{ t('admin.affiliates.config') }}
          </button>
        </div>
      </header>

      @if (config(); as ajustes) {
        <div class="text-[12px] text-ink-500 flex flex-wrap gap-x-4 gap-y-1">
          <span>
            {{ t('admin.affiliates.cfg.default') }}:
            <strong>{{ ajustes.porcentajePorDefecto }}%</strong>
          </span>
          <span>
            {{ t('admin.affiliates.cfg.window') }}:
            <strong>{{ ajustes.ventanaDeAtribucionDias }}d</strong>
          </span>
          <span>
            {{ t('admin.affiliates.cfg.return') }}:
            <strong>{{ ajustes.periodoDeDevolucionDias }}d</strong>
          </span>
          <span>
            {{ t('admin.affiliates.cfg.min') }}:
            <strong>{{ importe(ajustes.minimoDePagoCentimos) }}</strong>
          </span>
        </div>
      }

      <nx-afiliados-pagos [pagos]="pagos()" (cambia)="refresca()" />

      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="table table-zebra table-sm">
            <thead class="bg-ink-50 text-ink-500 text-left text-[12px]">
              <tr>
                <th class="px-4 py-2 font-medium">{{ t('admin.affiliates.col.affiliate') }}</th>
                <th class="px-4 py-2 font-medium">{{ t('admin.affiliates.col.status') }}</th>
                <th class="px-4 py-2 font-medium text-right">{{ t('admin.affiliates.col.codes') }}</th>
                <th class="px-4 py-2 font-medium text-right">{{ t('admin.affiliates.col.clicks') }}</th>
                <th class="px-4 py-2 font-medium text-right">
                  {{ t('admin.affiliates.col.conversions') }}
                </th>
                <th class="px-4 py-2 font-medium text-right">{{ t('admin.affiliates.col.cvr') }}</th>
                <th class="px-4 py-2 font-medium text-right">
                  {{ t('admin.affiliates.col.pending') }}
                </th>
                <th class="px-4 py-2 font-medium text-right">
                  {{ t('admin.affiliates.col.approved') }}
                </th>
                <th class="px-4 py-2 font-medium text-right">{{ t('admin.affiliates.col.paid') }}</th>
                <th class="px-4 py-2 font-medium">{{ t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              @if (cargando()) {
                @for (fila of esqueleto; track fila) {
                  <tr><td colspan="10" class="px-4 py-3"><div class="skeleton h-4 w-full"></div></td></tr>
                }
              } @else {
                @for (afiliado of afiliados(); track afiliado.id) {
                  <tr class="border-t border-ink-100 hover:bg-ink-50/50 cursor-pointer"
                      (click)="detalleId.set(afiliado.id)">
                    <td class="px-4 py-2">
                      <!-- El nombre es un BOTÓN además de una celda: la fila entera abre la ficha con
                           el ratón, pero sin esto no había forma de abrirla con el teclado. -->
                      <button type="button" class="text-left"
                              (click)="detalleId.set(afiliado.id)">
                        <span class="font-medium text-[13px] block">{{ afiliado.nombre ?? '—' }}</span>
                        <span class="text-[11px] text-ink-500 font-mono block">
                          {{ afiliado.email ?? '' }}
                        </span>
                      </button>
                    </td>
                    <td class="px-4 py-2">
                      <span class="badge badge-sm" [class]="color(afiliado.estado)">
                        {{ t('admin.affiliates.status.' + afiliado.estado) }}
                      </span>
                    </td>
                    <td class="px-4 py-2 text-right">{{ afiliado.codigos }}</td>
                    <td class="px-4 py-2 text-right">{{ afiliado.clics }}</td>
                    <td class="px-4 py-2 text-right">{{ afiliado.conversiones }}</td>
                    <td class="px-4 py-2 text-right text-[12px]">{{ conversion(afiliado) }}</td>
                    <td class="px-4 py-2 text-right text-amber-600">
                      {{ importe(afiliado.pendienteCentimos) }}
                    </td>
                    <td class="px-4 py-2 text-right text-emerald-600">
                      {{ importe(afiliado.aprobadoCentimos) }}
                    </td>
                    <td class="px-4 py-2 text-right">{{ importe(afiliado.pagadoCentimos) }}</td>
                    <td class="px-4 py-2" (click)="$event.stopPropagation()">
                      <div class="flex gap-1 flex-wrap">
                        @if (afiliado.estado !== 'ACTIVE') {
                          <button type="button"
                                  class="btn btn-ghost btn-xs btn-square text-emerald-600"
                                  [attr.title]="t('admin.affiliates.action.activate')"
                                  [attr.aria-label]="t('admin.affiliates.action.activate')"
                                  (click)="cambiaEstado(afiliado, 'ACTIVE')">
                            <fa-icon [icon]="iconos.activar" />
                          </button>
                        }
                        @if (afiliado.estado !== 'SUSPENDED') {
                          <button type="button" class="btn btn-ghost btn-xs btn-square text-error"
                                  [attr.title]="t('admin.affiliates.action.suspend')"
                                  [attr.aria-label]="t('admin.affiliates.action.suspend')"
                                  (click)="cambiaEstado(afiliado, 'SUSPENDED')">
                            <fa-icon [icon]="iconos.suspender" />
                          </button>
                        }
                        <button type="button"
                                class="btn btn-ghost btn-xs btn-square text-brand-700 disabled:opacity-30"
                                [disabled]="afiliado.aprobadoCentimos <= 0"
                                [attr.title]="t('admin.affiliates.action.payout')"
                                [attr.aria-label]="t('admin.affiliates.action.payout')"
                                (click)="paga(afiliado)">
                          <fa-icon [icon]="iconos.pagar" />
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="10" class="px-4 py-10 text-center text-ink-500 text-[13px]">
                      {{ t('filters.no_results') }}
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>

      <nx-paginacion [pagina]="pagina()" [paginas]="paginas()" (cambia)="vaA($event)" />

      @if (configAbierta() && config(); as ajustes) {
        <nx-afiliados-configuracion [config]="ajustes" (cierra)="configAbierta.set(false)"
                                    (guardada)="configGuardada()" />
      }
      @if (detalleId(); as id) {
        <nx-afiliados-detalle [id]="id" [divisa]="divisa()" (cierra)="detalleId.set(null)"
                              (cambia)="carga()" />
      }
    </div>
  `,
})
export class AfiliadosPage {
  private readonly traduccion = inject(TraduccionService);
  protected readonly t = this.traduccion.t;
  private readonly tCon = this.traduccion.tCon;
  private readonly importes = inject(ImportesStore);
  private readonly dialogo = inject(DialogoStore);
  private readonly avisos = inject(AvisosStore);
  private readonly busca = inject(BuscaAfiliados);
  private readonly cambiaElEstado = inject(CambiaElEstadoDelAfiliado);
  private readonly reindexaAfiliados = inject(ReindexaAfiliados);
  private readonly consultaConfig = inject(ConsultaLaConfiguracionDeAfiliados);
  private readonly consultaPagos = inject(ConsultaPagosPendientes);
  private readonly pagaAlAfiliado = inject(PagaAlAfiliado);
  private readonly apruebaComisiones = inject(ApruebaComisionesVencidas);

  protected readonly iconos = {
    reindexar: faRotateRight, vencidas: faClockRotateLeft, ajustes: faGear,
    activar: faCircleCheck, suspender: faBan, pagar: faMoneyBillTransfer,
  };
  protected readonly estados = ESTADOS_DE_AFILIADO;
  protected readonly esqueleto = [1, 2, 3, 4, 5];

  protected readonly afiliados = signal<readonly Afiliado[]>([]);
  protected readonly paginas = signal(1);
  protected readonly pagina = signal(0);
  protected readonly estado = signal('');
  protected readonly cargando = signal(true);
  protected readonly config = signal<ConfiguracionDeAfiliados | null>(null);
  protected readonly pagos = signal<readonly PagoPendiente[]>([]);
  protected readonly configAbierta = signal(false);
  protected readonly detalleId = signal<string | null>(null);
  protected readonly reindexando = signal(false);
  protected readonly aprobando = signal(false);

  /** Sin configuración todavía se supone el euro, que es lo que hacía el panel de React. */
  protected readonly divisa = computed(() => this.config()?.divisa ?? 'EUR');

  constructor() {
    void this.importes.carga();
    void this.carga();
    void this.cargaElContexto();
  }

  protected importe(centimos: number | null | undefined): string {
    return this.importes.escribeCentimos(centimos ?? 0, this.divisa());
  }

  protected color(estado: string): string {
    return COLORES[estado] ?? 'badge-ghost';
  }

  /** Sin clics no hay CERO por ciento: es que no hay dato, y un 0 % se lee como «no convierte». */
  protected conversion(afiliado: Afiliado): string {
    const tasa = tasaDeConversion(afiliado);
    return tasa === null ? '—' : `${tasa}%`;
  }

  protected filtra(evento: Event): void {
    this.estado.set((evento.target as HTMLSelectElement).value);
    // Al cambiar el filtro se vuelve a la primera página: quedarse en la sexta de un listado que ahora
    // tiene dos deja la tabla vacía sin decir por qué.
    this.pagina.set(0);
    void this.carga();
  }

  protected vaA(pagina: number): void {
    this.pagina.set(pagina);
    void this.carga();
  }

  protected async carga(): Promise<void> {
    this.cargando.set(true);
    const resultado = await this.busca.ejecuta(this.estado() || undefined, this.pagina(), TAMANO);
    this.cargando.set(false);
    if (!resultado.ok) {
      // Un fallo deja el listado vacío y avisa: enseñar los datos anteriores como si fueran los de
      // ahora es peor que no enseñar nada.
      this.afiliados.set([]);
      this.avisos.error(resultado.error.mensaje || this.t('common.error'));
      return;
    }
    this.afiliados.set(resultado.valor.elementos);
    this.paginas.set(paginasAlMenosUna(resultado.valor.paginas));
  }

  protected refresca(): void {
    void this.carga();
    void this.cargaElContexto();
  }

  protected configGuardada(): void {
    this.configAbierta.set(false);
    void this.cargaElContexto();
  }

  protected async reindexa(): Promise<void> {
    this.reindexando.set(true);
    const resultado = await this.reindexaAfiliados.ejecuta();
    this.reindexando.set(false);
    if (!resultado.ok) {
      this.avisos.error(this.t('admin.reindex_error'));
      return;
    }
    this.avisos.exito(this.tCon('admin.reindex_ok', { n: resultado.valor }));
    void this.carga();
  }

  protected async apruebaVencidas(): Promise<void> {
    this.aprobando.set(true);
    const resultado = await this.apruebaComisiones.ejecuta();
    this.aprobando.set(false);
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('common.error'));
      return;
    }
    this.avisos.exito(this.tCon('admin.affiliates.approved_done', { n: resultado.valor }));
    this.refresca();
  }

  protected async cambiaEstado(afiliado: Afiliado, estado: string): Promise<void> {
    const resultado = await this.cambiaElEstado.ejecuta(afiliado.id, estado);
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('common.error'));
      return;
    }
    this.refresca();
  }

  /**
   * Paga al afiliado todo lo que tenga aprobado.
   *
   * <p>Se pregunta antes con el importe DELANTE: es dinero que sale, y el botón está en la misma fila
   * que activar y suspender.
   */
  protected async paga(afiliado: Afiliado): Promise<void> {
    const confirmado = await this.dialogo.confirma(
      this.tCon('admin.affiliates.payout_confirm', { n: this.importe(afiliado.aprobadoCentimos) }),
    );
    if (!confirmado) {
      return;
    }
    const resultado = await this.pagaAlAfiliado.ejecuta(afiliado.id);
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('common.error'));
      return;
    }
    // El importe pagado se escribe con el formateador del panel y en la divisa del programa; el React
    // lo pintaba a pelo con dos decimales y sin símbolo, y no se sabía en qué moneda estaba.
    this.avisos.exito(
      this.tCon('admin.affiliates.payout_done', { n: this.importe(resultado.valor) }),
    );
    this.refresca();
  }

  private async cargaElContexto(): Promise<void> {
    // La configuración y las solicitudes se piden A LA VEZ y ninguna tumba a la otra: que no se pueda
    // leer la configuración no puede dejar sin ver los pagos que esperan decisión.
    const [config, pagos] = await Promise.all([
      this.consultaConfig.ejecuta(),
      this.consultaPagos.ejecuta(),
    ]);
    if (config.ok) {
      this.config.set(config.valor);
    }
    this.pagos.set(pagos.ok ? pagos.valor : []);
  }
}
