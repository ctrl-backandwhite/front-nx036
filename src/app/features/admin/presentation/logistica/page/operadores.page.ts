import { Component, computed, effect, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faHeadset } from '@fortawesome/free-solid-svg-icons';
import { FormField, form } from '@angular/forms/signals';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import {
  FilaDeReporte,
  formateaCny,
  nombreDeOperador,
  totalesDelReporte,
  ultimoMes,
} from '../../../domain/logistica/model/operador';
import { ConsultaReporteDeOperadores } from '../../../application/logistica/use-case/consulta-ganancias.use-case';

/**
 * Reporte de administración: operaciones y comisión acumulada por operador.
 *
 * <p>La comisión se devenga al ENTREGAR, no al despachar: un pedido enviado todavía puede volver, y lo
 * que vuelve no se ha ganado. Por eso las cifras de aquí no cuadran con «pedidos procesados».
 *
 * <p>Los importes van en YUAN, que es la divisa del desembolso al proveedor sobre la que se calcula.
 */
@Component({
  selector: 'nx-operadores-page',
  imports: [FaIconComponent, FormField],
  template: `
    <div class="space-y-5">
      <div>
        <h1 class="text-xl font-semibold flex items-center gap-2">
          <fa-icon [icon]="iconoSoporte" class="text-primary" />
          {{ t('admin.operators.title') }}
        </h1>
        <p class="text-sm text-ink-500">{{ t('admin.operators.subtitle') }}</p>
      </div>

      <div class="flex flex-wrap items-end gap-3 card bg-base-100 p-4">
        <div>
          <label for="operadores-desde" class="text-sm block">{{ t('operator.from') }}</label>
          <input
            id="operadores-desde"
            type="date"
            class="input input-bordered input-sm block mt-1"
            [formField]="formulario.desde"
          />
        </div>
        <div>
          <label for="operadores-hasta" class="text-sm block">{{ t('operator.to') }}</label>
          <input
            id="operadores-hasta"
            type="date"
            class="input input-bordered input-sm block mt-1"
            [formField]="formulario.hasta"
          />
        </div>
        <div class="ml-auto text-sm text-ink-600">
          {{ t('admin.operators.total') }}: <strong>{{ totales().operaciones }}</strong>
          {{ t('admin.operators.ops') }} ·
          <strong>{{ cny(totales().comisionCentimosCny) }}</strong>
        </div>
      </div>

      <div class="card bg-base-100 overflow-x-auto">
        <table class="table table-sm">
          <thead>
            <tr>
              <th>{{ t('admin.operators.operator') }}</th>
              <th>{{ t('admin.operators.operations') }}</th>
              <th>{{ t('admin.operators.commission') }}</th>
            </tr>
          </thead>
          <tbody>
            @for (fila of filas(); track fila.operador) {
              <tr>
                <td>
                  <div class="font-medium">{{ nombre(fila) }}</div>
                  @if (fila.email) {
                    <div class="text-[12px] text-ink-500">{{ fila.email }}</div>
                  }
                </td>
                <td>{{ fila.operaciones }}</td>
                <td class="font-medium">{{ cny(fila.comisionCentimosCny) }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="3" class="text-center text-sm text-ink-500 py-6">
                  {{ t('admin.operators.empty') }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class OperadoresPage {
  protected readonly iconoSoporte = faHeadset;
  protected readonly cny = formateaCny;
  protected readonly nombre = nombreDeOperador;
  protected readonly t = inject(TraduccionService).t;

  private readonly consulta = inject(ConsultaReporteDeOperadores);
  private readonly avisos = inject(AvisosStore);

  /** El intervalo es UNA cosa: las dos fechas viven en el mismo modelo y en el mismo formulario. */
  protected readonly rango = signal(ultimoMes(new Date()));
  protected readonly formulario = form(this.rango);

  protected readonly filas = signal<readonly FilaDeReporte[]>([]);

  protected readonly totales = computed(() => totalesDelReporte(this.filas()));

  constructor() {
    effect(() => {
      void this.carga(this.rango());
    });
  }

  private async carga(rango: { desde: string; hasta: string }): Promise<void> {
    const resultado = await this.consulta.ejecuta(rango);
    if (resultado.ok) {
      this.filas.set(resultado.valor);
      return;
    }
    // Un fallo NO puede pintarse como una tabla vacía: «sin operaciones» y «no se pudo consultar» son
    // cosas distintas, y confundirlas hace pensar que nadie ha trabajado este mes.
    this.avisos.error(resultado.error.mensaje || this.t('common.error'));
  }
}
