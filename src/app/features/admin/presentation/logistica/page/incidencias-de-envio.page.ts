import { Component, computed, effect, inject, linkedSignal, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormField, form } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { FormatoDeFecha } from '@core/i18n/formato-de-fecha';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import {
  CriterioDeIncidencias,
  EstadoDeIncidencia,
  IncidenciaDeEnvio,
  TRANSPORTISTAS_FILTRABLES,
} from '../../../domain/logistica/model/incidencia-de-envio';
import {
  BuscaIncidencias,
  ResuelveIncidencia,
} from '../../../application/logistica/use-case/gestiona-incidencias.use-case';
import { Paginacion } from '../component/paginacion';

/** Cuántas filas por página. */
const POR_PAGINA = 25;

/**
 * La bandeja de incidencias de envío.
 *
 * <p>Pagina y filtra EN EL SERVIDOR: cada cambio de transportista o de estado es una petición, y el
 * listado no se recorta en el navegador, que a volumen solo vería las 25 filas de la página. Por defecto
 * enseña las abiertas, que son las que piden hacer algo.
 *
 * <p>Resolver exige una nota. Cerrar una incidencia sin decir qué se hizo la deja igual de oscura que
 * si siguiera abierta.
 */
@Component({
  selector: 'nx-incidencias-de-envio-page',
  imports: [FaIconComponent, FormField, Paginacion, RouterLink],
  template: `
    <div class="space-y-5">
      <div class="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 class="flex items-center gap-2">
            <fa-icon [icon]="iconoAviso" class="text-warning" />
            {{ t('admin.nav.shipment_incidents') }}
          </h1>
          <p class="text-sm text-ink-500 mt-1">{{ t('admin.incidents.subtitle') }}</p>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <label class="text-xs text-ink-500 flex items-center gap-2">
            {{ t('tracking.carrier') }}
            <select
              class="select select-bordered select-sm"
              [attr.aria-label]="t('tracking.carrier')"
              [formField]="filtro.transportista"
            >
              <option value="">{{ t('admin.incidents.all_carriers') }}</option>
              @for (opcion of transportistas; track opcion) {
                <option [value]="opcion">{{ opcion }}</option>
              }
            </select>
          </label>
          <label class="text-xs text-ink-500 flex items-center gap-2">
            {{ t('admin.incidents.status') }}
            <select
              class="select select-bordered select-sm"
              [attr.aria-label]="t('admin.incidents.status')"
              [formField]="filtro.estado"
            >
              <option value="">{{ t('admin.incidents.status.ALL') }}</option>
              <option value="OPEN">{{ t('admin.incidents.status.OPEN') }}</option>
              <option value="RESOLVED">{{ t('admin.incidents.status.RESOLVED') }}</option>
            </select>
          </label>
        </div>
      </div>

      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="table table-zebra table-sm">
            <thead class="bg-ink-50 text-ink-500 text-left text-[12px]">
              <tr>
                <th class="px-3 py-2 font-medium">{{ t('orders.col.order') }}</th>
                <th class="px-3 py-2 font-medium">{{ t('tracking.parcel') }}</th>
                <th class="px-3 py-2 font-medium">{{ t('tracking.carrier') }}</th>
                <th class="px-3 py-2 font-medium">{{ t('admin.incidents.col.tracking') }}</th>
                <th class="px-3 py-2 font-medium">{{ t('admin.incidents.col.code') }}</th>
                <th class="px-3 py-2 font-medium">{{ t('admin.incidents.col.cause') }}</th>
                <th class="px-3 py-2 font-medium">{{ t('admin.incidents.col.fault') }}</th>
                <th class="px-3 py-2 font-medium">{{ t('admin.incidents.status') }}</th>
                <th class="px-3 py-2 font-medium">{{ t('admin.incidents.col.opened') }}</th>
                <th class="px-3 py-2 font-medium">{{ t('admin.incidents.col.resolution') }}</th>
                <th class="px-3 py-2 font-medium w-28">{{ t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (incidencia of incidencias(); track incidencia.id) {
                <tr class="border-t border-ink-100" [attr.data-incidencia]="incidencia.id">
                  <td class="px-3 py-2">
                    <a
                      [routerLink]="['/admin/orders', incidencia.pedidoId]"
                      class="font-mono text-primary hover:underline"
                    >
                      {{ incidencia.numeroDePedido || incidencia.pedidoId }}
                    </a>
                  </td>
                  <td class="px-3 py-2">{{ incidencia.secuenciaDelBulto ?? '—' }}</td>
                  <td class="px-3 py-2">{{ incidencia.transportista || '—' }}</td>
                  <td class="px-3 py-2 font-mono text-[12px]">
                    {{ incidencia.numeroDeSeguimiento || '—' }}
                  </td>
                  <td class="px-3 py-2 font-mono text-[12px]">{{ incidencia.codigo || '—' }}</td>
                  <td class="px-3 py-2 max-w-[18rem]">{{ incidencia.causa || '—' }}</td>
                  <td class="px-3 py-2">
                    <span
                      class="badge badge-sm"
                      [class.badge-error]="incidencia.culpaNuestra"
                      [class.badge-ghost]="!incidencia.culpaNuestra"
                    >
                      {{
                        incidencia.culpaNuestra
                          ? t('admin.incidents.fault.ours')
                          : t('admin.incidents.fault.other')
                      }}
                    </span>
                  </td>
                  <td class="px-3 py-2">
                    <span
                      class="badge badge-sm"
                      [class.badge-warning]="incidencia.estado === 'OPEN'"
                      [class.badge-success]="incidencia.estado === 'RESOLVED'"
                    >
                      {{ t('admin.incidents.status.' + incidencia.estado) }}
                    </span>
                  </td>
                  <td class="px-3 py-2 whitespace-nowrap">{{ fecha(incidencia.abiertaEl) }}</td>
                  <td class="px-3 py-2 text-[12px]">
                    @if (incidencia.estado === 'RESOLVED') {
                      <div>
                        {{ fecha(incidencia.resueltaEl) }}
                        @if (incidencia.resueltaPor) {
                          · {{ t('admin.incidents.resolved_by') }} {{ incidencia.resueltaPor }}
                        }
                      </div>
                      @if (incidencia.nota) {
                        <div class="text-ink-500">{{ incidencia.nota }}</div>
                      }
                    } @else {
                      —
                    }
                  </td>
                  <td class="px-3 py-2">
                    @if (incidencia.estado === 'OPEN') {
                      <button
                        type="button"
                        class="btn btn-outline btn-xs min-h-11"
                        [disabled]="resolviendo() === incidencia.id"
                        (click)="resuelve(incidencia)"
                      >
                        {{ t('admin.incidents.resolve') }}
                      </button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="11" class="px-4 py-8 text-center text-sm text-ink-500">
                    @if (error()) {
                      {{ t('admin.incidents.load_error') }}
                    } @else if (!cargando()) {
                      {{ t('admin.incidents.empty') }}
                    } @else {
                      {{ t('common.loading') }}
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <div class="flex items-center justify-between flex-wrap gap-2 text-[12px] text-ink-500">
        <span>{{ total() }}</span>
        <nx-paginacion [(pagina)]="pagina" [paginas]="paginas()" />
      </div>
    </div>
  `,
})
export class IncidenciasDeEnvioPage {
  protected readonly t = inject(TraduccionService).t;
  protected readonly iconoAviso = faTriangleExclamation;
  protected readonly transportistas = TRANSPORTISTAS_FILTRABLES;

  private readonly busca = inject(BuscaIncidencias);
  private readonly resolutor = inject(ResuelveIncidencia);
  private readonly dialogo = inject(DialogoStore);
  private readonly avisos = inject(AvisosStore);
  private readonly fechas = inject(FormatoDeFecha);

  /** Por defecto, las abiertas: son las que piden hacer algo. El vacío significa «todas». */
  protected readonly seleccion = signal({ transportista: '', estado: 'OPEN' });
  protected readonly filtro = form(this.seleccion);

  /** Al cambiar cualquier filtro se vuelve a la primera página: la actual puede no existir ya. */
  protected readonly pagina = linkedSignal({
    source: this.seleccion,
    computation: () => 0,
  });

  protected readonly incidencias = signal<readonly IncidenciaDeEnvio[]>([]);
  protected readonly total = signal(0);
  protected readonly paginas = signal(1);
  protected readonly cargando = signal(true);
  protected readonly error = signal(false);
  protected readonly resolviendo = signal<string | null>(null);

  private readonly criterio = computed<CriterioDeIncidencias>(() => {
    const { transportista, estado } = this.seleccion();
    return {
      transportista: transportista || undefined,
      estado: (estado || undefined) as EstadoDeIncidencia | undefined,
      pagina: this.pagina(),
      tamano: POR_PAGINA,
    };
  });

  constructor() {
    effect(() => {
      void this.pide(this.criterio());
    });
  }

  private async pide(criterio: CriterioDeIncidencias): Promise<void> {
    this.cargando.set(true);
    try {
      const resultado = await this.busca.ejecuta(criterio);
      this.error.set(!resultado.ok);
      if (!resultado.ok) {
        this.incidencias.set([]);
        this.avisos.error(resultado.error.mensaje || this.t('admin.incidents.load_error'));
        return;
      }
      this.incidencias.set(resultado.valor.incidencias);
      this.total.set(resultado.valor.total);
      this.paginas.set(Math.max(1, resultado.valor.paginas));
    } finally {
      this.cargando.set(false);
    }
  }

  protected fecha(valor?: string): string {
    return valor ? this.fechas.fechaYHora(valor) : '—';
  }

  protected async resuelve(incidencia: IncidenciaDeEnvio): Promise<void> {
    const datos = await this.dialogo.formulario({
      titulo: this.t('admin.incidents.resolve_title'),
      mensaje: this.t('admin.incidents.resolve_message'),
      campos: [
        {
          nombre: 'nota',
          etiqueta: this.t('admin.incidents.resolve_note'),
          obligatorio: true,
        },
      ],
    });
    if (!datos) {
      return;
    }
    this.resolviendo.set(incidencia.id);
    try {
      const resultado = await this.resolutor.ejecuta(incidencia.id, datos['nota'] ?? '');
      if (!resultado.ok) {
        this.avisos.error(resultado.error.mensaje || this.t('errors.generic'));
        return;
      }
      this.avisos.exito(this.t('admin.incidents.resolved_ok'));
      await this.pide(this.criterio());
    } finally {
      this.resolviendo.set(null);
    }
  }
}
