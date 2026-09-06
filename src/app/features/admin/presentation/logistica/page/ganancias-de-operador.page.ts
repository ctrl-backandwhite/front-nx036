import { Component, computed, effect, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBoxesPacking,
  faReceipt,
  faRotateRight,
  faSackDollar,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { QuienMiraStore } from '../../../application/logistica/state/quien-mira.store';
import {
  PaginaDeOperaciones,
  ResumenDeGanancias,
  formateaCny,
  paginasDe,
  ultimoMes,
} from '../../../domain/logistica/model/operador';
import {
  ConsultaMisGanancias,
  ReindexaOperaciones,
} from '../../../application/logistica/use-case/consulta-ganancias.use-case';
import { Paginacion } from '../component/paginacion';

/** Cuántas operaciones por página. Las justas para revisarlas sin desplazarse eternamente. */
const POR_PAGINA = 20;

/**
 * El panel del propio operador: su comisión acumulada y su histórico.
 *
 * <p>Un fallo de consulta NO se pinta como «¥ 0,00 / sin operaciones». Para quien cobra por producción
 * eso significa «este mes no has ganado nada», que es justo lo contrario de «no se ha podido
 * consultar»: cuando falla se enseñan guiones y un aviso con reintento, nunca ceros.
 *
 * <p>La comisión se devenga al ENTREGAR, por eso el rótulo cuenta órdenes entregadas.
 */
@Component({
  selector: 'nx-ganancias-de-operador-page',
  imports: [FaIconComponent, Paginacion],
  template: `
    <div class="space-y-5">
      <div class="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 class="text-xl font-semibold">{{ t('operator.earnings.title') }}</h1>
          <p class="text-sm text-ink-500">{{ t('operator.earnings.subtitle') }}</p>
        </div>
        @if (esAdministrador()) {
          <button
            type="button"
            (click)="reindexa()"
            [disabled]="reindexando()"
            class="btn btn-outline btn-sm text-[12px]"
            [title]="t('admin.reindex')"
          >
            <fa-icon [icon]="iconos.recarga" [class.fa-spin]="reindexando()" />
            {{ t('admin.reindex') }}
          </button>
        }
      </div>

      @if (fallo()) {
        <div role="alert" class="alert alert-error text-sm flex items-center gap-3">
          <span>{{ t('operator.earnings.load_error') }}</span>
          <button type="button" (click)="reintenta()" class="btn btn-sm ml-auto">
            {{ t('common.retry') }}
          </button>
        </div>
      }

      <div class="flex flex-wrap items-end gap-3 card bg-base-100 p-4">
        <div>
          <label for="ganancias-desde" class="text-sm block">{{ t('operator.from') }}</label>
          <input
            id="ganancias-desde"
            type="date"
            class="input input-bordered input-sm block mt-1"
            [value]="desde()"
            (change)="cambiaDesde($any($event.target).value)"
          />
        </div>
        <div>
          <label for="ganancias-hasta" class="text-sm block">{{ t('operator.to') }}</label>
          <input
            id="ganancias-hasta"
            type="date"
            class="input input-bordered input-sm block mt-1"
            [value]="hasta()"
            (change)="cambiaHasta($any($event.target).value)"
          />
        </div>
      </div>

      <!-- Móvil primero: una columna, y dos a partir de la anchura pequeña. -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="card bg-base-100 p-5 flex-row items-center gap-4">
          <fa-icon [icon]="iconos.saco" class="text-3xl text-primary" />
          <div>
            <div class="text-2xl font-semibold">{{ comisionAcumulada() }}</div>
            <div class="text-sm text-ink-500">{{ t('operator.earnings.accumulated') }}</div>
          </div>
        </div>
        <div class="card bg-base-100 p-5 flex-row items-center gap-4">
          <fa-icon [icon]="iconos.bultos" class="text-3xl text-success" />
          <div>
            <div class="text-2xl font-semibold">{{ entregadas() }}</div>
            <div class="text-sm text-ink-500">{{ t('operator.earnings.operations') }}</div>
          </div>
        </div>
      </div>

      <div class="card bg-base-100 overflow-hidden">
        <div class="px-4 py-3 border-b border-base-200 font-medium flex items-center gap-2">
          <fa-icon [icon]="iconos.recibo" class="text-primary" />
          {{ t('operator.history.title') }}
        </div>
        <div class="overflow-x-auto">
          <table class="table table-sm">
            <thead>
              <tr>
                <th>{{ t('operator.history.order') }}</th>
                <th>{{ t('operator.history.items') }}</th>
                <th>{{ t('operator.history.commission') }}</th>
                <th>{{ t('operator.history.date') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (operacion of operaciones(); track operacion.pedidoId) {
                <tr>
                  <td class="font-mono text-[12px]">{{ operacion.numeroDePedido }}</td>
                  <td>{{ operacion.articulos }}</td>
                  <td class="font-medium">{{ cny(operacion.comisionCentimosCny) }}</td>
                  <td class="text-[12px] text-ink-500">{{ operacion.procesadoEl }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4" class="text-center text-sm text-ink-500 py-6">
                    {{
                      fallo()
                        ? t('operator.history.load_error')
                        : t('operator.history.empty')
                    }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        @if (paginas() > 1) {
          <div class="px-4 py-2 border-t border-base-200">
            <nx-paginacion [(pagina)]="pagina" [paginas]="paginas()" />
          </div>
        }
      </div>
    </div>
  `,
})
export class GananciasDeOperadorPage {
  protected readonly cny = formateaCny;
  protected readonly t = inject(TraduccionService).t;

  protected readonly iconos = {
    saco: faSackDollar,
    bultos: faBoxesPacking,
    recibo: faReceipt,
    recarga: faRotateRight,
  };

  private readonly consulta = inject(ConsultaMisGanancias);
  private readonly reindexador = inject(ReindexaOperaciones);
  private readonly quienMira = inject(QuienMiraStore);
  private readonly avisos = inject(AvisosStore);

  private readonly rangoInicial = ultimoMes(new Date());

  protected readonly desde = signal(this.rangoInicial.desde);
  protected readonly hasta = signal(this.rangoInicial.hasta);
  protected readonly pagina = signal(0);
  protected readonly reindexando = signal(false);
  protected readonly fallo = signal(false);

  private readonly resumen = signal<ResumenDeGanancias | null>(null);
  private readonly historico = signal<PaginaDeOperaciones | null>(null);

  protected readonly esAdministrador = this.quienMira.esAdministrador;
  protected readonly operaciones = computed(() => this.historico()?.operaciones ?? []);
  protected readonly paginas = computed(() =>
    paginasDe(this.historico()?.total ?? 0, POR_PAGINA),
  );

  /** Con la consulta fallida se enseña un guion, nunca un cero: un cero afirma algo que no se sabe. */
  protected readonly comisionAcumulada = computed(() =>
    this.fallo() ? '—' : formateaCny(this.resumen()?.comisionCentimosCny ?? 0),
  );
  protected readonly entregadas = computed(() =>
    this.fallo() ? '—' : String(this.resumen()?.operaciones ?? 0),
  );

  constructor() {
    effect(() => {
      const rango = { desde: this.desde(), hasta: this.hasta() };
      const pagina = this.pagina();
      void this.carga(rango, pagina);
    });
  }

  private async carga(
    rango: { desde: string; hasta: string },
    pagina: number,
  ): Promise<void> {
    const resultado = await this.consulta.ejecuta(rango, pagina, POR_PAGINA);
    this.fallo.set(!resultado.ok);
    if (!resultado.ok) {
      return;
    }
    this.resumen.set(resultado.valor.resumen);
    this.historico.set(resultado.valor.historico);
  }

  /** Cambiar el rango vuelve a la primera página: la tercera del rango anterior no significa nada. */
  protected cambiaDesde(valor: string): void {
    this.desde.set(valor);
    this.pagina.set(0);
  }

  protected cambiaHasta(valor: string): void {
    this.hasta.set(valor);
    this.pagina.set(0);
  }

  protected reintenta(): void {
    void this.carga({ desde: this.desde(), hasta: this.hasta() }, this.pagina());
  }

  protected async reindexa(): Promise<void> {
    this.reindexando.set(true);
    try {
      const resultado = await this.reindexador.ejecuta();
      if (!resultado.ok) {
        this.avisos.error(this.t('admin.reindex_error'));
        return;
      }
      this.avisos.exito(this.t('admin.reindex_ok').replace('{n}', String(resultado.valor)));
      this.reintenta();
    } finally {
      this.reindexando.set(false);
    }
  }
}
