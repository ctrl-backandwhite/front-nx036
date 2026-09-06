import { Component, inject, input } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { CampoDeImportacion } from '../../../domain/catalogo/model/esquema-de-importacion';

/**
 * La referencia de campos de la importación: qué acepta, qué es obligatorio y de qué tipo.
 *
 * <p>Está a la vista y no escondida en la documentación porque es la única forma de descubrir que un
 * campo existe sin leer el código del backend. Faltar aquí tiene consecuencias: cuando `shippingCny` no
 * estaba, quien copiaba la plantilla recibía «Falta el envío» sin saber de dónde salía ese campo.
 */
@Component({
  selector: 'nx-tabla-de-campos',
  template: `
    <div class="rounded-box bg-base-200/60 border border-base-200 text-[12px] max-h-56 overflow-auto">
      <table class="w-full">
        <thead class="text-[11px] uppercase tracking-wide opacity-60 sticky top-0 bg-base-200">
          <tr>
            <th class="text-left font-medium px-3 py-1.5">{{ t('admin.catalog.bulk.col_field') }}</th>
            <th class="text-left font-medium px-2 py-1.5">{{ t('admin.catalog.bulk.col_req') }}</th>
            <th class="text-left font-medium px-2 py-1.5">{{ t('admin.catalog.bulk.col_type') }}</th>
            <th class="text-left font-medium px-3 py-1.5">{{ t('admin.catalog.bulk.col_desc') }}</th>
          </tr>
        </thead>
        <tbody>
          @for (campo of campos(); track campo.clave) {
            <tr class="border-t border-base-300/50 align-top">
              <td class="px-3 py-1.5 font-mono whitespace-nowrap">{{ campo.clave }}</td>
              <td class="px-2 py-1.5">
                @if (campo.obligatorio) {
                  <span class="badge badge-sm bg-error/15 text-error border-0">
                    {{ t('admin.catalog.bulk.required_badge') }}
                  </span>
                } @else {
                  <span class="badge badge-sm bg-base-300/60 text-ink-500 border-0">
                    {{ t('admin.catalog.bulk.optional_badge') }}
                  </span>
                }
              </td>
              <td class="px-2 py-1.5 font-mono opacity-60 whitespace-nowrap">{{ campo.tipo }}</td>
              <td class="px-3 py-1.5 opacity-80">{{ t(campo.descripcion) }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class TablaDeCampos {
  readonly campos = input.required<readonly CampoDeImportacion[]>();

  protected readonly t = inject(TraduccionService).t;
}
