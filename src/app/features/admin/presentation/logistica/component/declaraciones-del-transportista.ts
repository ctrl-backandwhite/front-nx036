import { Component, computed, inject, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faFileLines } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { nombreDePais } from '@ds/component/pais/paises';
import {
  DeclaracionDeEnvio,
  nombreDeclarado,
  valorDeclarado,
} from '../../../domain/logistica/model/seguimiento';

/**
 * Lo que se le declaró al transportista, bulto a bulto.
 *
 * <p>Va PLEGADO porque es información densa que solo se consulta cuando algo ha ido mal: ante un rechazo
 * de aduana, saber qué se transmitió —a qué dirección y bajo qué partida arancelaria— evita entrar al
 * panel del transportista a buscarlo.
 *
 * <p>Los envíos anteriores a que esto se archivara no traen declaración: no se pinta nada y ya está.
 */
@Component({
  selector: 'nx-declaraciones-del-transportista',
  imports: [FaIconComponent],
  template: `
    @if (declaraciones().length > 0) {
      <section class="space-y-2">
        @for (ficha of fichas(); track ficha.declaracion.secuencia) {
          @let declaracion = ficha.declaracion;
          <details class="card p-4">
            <summary class="cursor-pointer text-sm font-medium flex flex-wrap items-center gap-2">
              <fa-icon [icon]="iconoFicha" class="text-brand-600" />
              {{ t('admin.orders.declaration.title') }}
              <span class="text-[11px] text-ink-500">
                {{ t('admin.orders.declaration.parcel') }} {{ declaracion.secuencia }}
                @if (declaracion.numeroDeGuia; as guia) {
                  · {{ guia }}
                }
              </span>
            </summary>

            <p class="text-[11px] text-ink-500 mt-2">{{ t('admin.orders.declaration.note') }}</p>

            <div class="mt-3">
              <div class="text-[11px] uppercase tracking-wider text-ink-600 mb-1">
                {{ t('admin.orders.declaration.receiver') }}
              </div>
              @if (declaracion.destinatario; as destinatario) {
                <div class="text-sm leading-relaxed">
                  <div class="font-medium">{{ ficha.nombre || '—' }}</div>
                  @for (linea of destinatario.lineas; track $index) {
                    <div class="text-ink-700">{{ linea }}</div>
                  }
                  <div class="text-ink-700">
                    {{ destinatario.codigoPostal }} {{ destinatario.ciudad }}
                    @if (destinatario.provincia) {
                      , {{ destinatario.provincia }}
                    }
                  </div>
                  <div class="text-ink-700">{{ ficha.pais }}</div>
                  @if (destinatario.telefono; as telefono) {
                    <div class="text-ink-500 text-[12px] mt-1">{{ telefono }}</div>
                  }
                  @if (destinatario.email; as email) {
                    <div class="text-ink-500 text-[12px]">{{ email }}</div>
                  }
                </div>
              } @else {
                <div class="text-ink-500 text-[12px]">{{ t('admin.orders.detail.no_address') }}</div>
              }
            </div>

            <div class="mt-4">
              <div class="text-[11px] uppercase tracking-wider text-ink-600 mb-1">
                {{ t('admin.orders.declaration.lines') }}
              </div>
              @if (declaracion.lineas.length > 0) {
                <!-- Se desplaza dentro de su caja: la tabla tiene seis columnas y en el móvil la
                     página entera no puede irse de lado. -->
                <div class="overflow-x-auto">
                  <table class="table table-sm">
                    <thead class="bg-ink-50 text-ink-500 text-left text-[12px]">
                      <tr>
                        <th class="px-3 py-2 font-medium">
                          {{ t('admin.orders.declaration.name_en') }}
                        </th>
                        <th class="px-3 py-2 font-medium">
                          {{ t('admin.orders.declaration.name_local') }}
                        </th>
                        <th class="px-3 py-2 font-medium">
                          {{ t('admin.orders.declaration.hs_code') }}
                        </th>
                        <th class="px-3 py-2 font-medium text-right">
                          {{ t('admin.orders.declaration.qty') }}
                        </th>
                        <th class="px-3 py-2 font-medium text-right">
                          {{ t('admin.orders.declaration.unit_price') }}
                        </th>
                        <th class="px-3 py-2 font-medium text-right">
                          {{ t('admin.orders.declaration.unit_weight') }}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (linea of declaracion.lineas; track $index) {
                        <tr class="border-t border-ink-100">
                          <td class="px-3 py-2">{{ linea.descripcionEn || '—' }}</td>
                          <td class="px-3 py-2">{{ linea.descripcionLocal || '—' }}</td>
                          <td class="px-3 py-2 font-mono text-[12px]">
                            {{ linea.partidaArancelaria || '—' }}
                          </td>
                          <td class="px-3 py-2 text-right">{{ linea.cantidad }}</td>
                          <td class="px-3 py-2 text-right">{{ valor(linea) ?? '—' }}</td>
                          <td class="px-3 py-2 text-right">
                            {{ linea.pesoUnitarioKg !== undefined ? linea.pesoUnitarioKg + ' kg' : '—' }}
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              } @else {
                <div class="text-ink-500 text-[12px]">{{ t('admin.orders.detail.no_items') }}</div>
              }
            </div>
          </details>
        }
      </section>
    }
  `,
})
export class DeclaracionesDelTransportista {
  readonly declaraciones = input.required<readonly DeclaracionDeEnvio[]>();

  protected readonly iconoFicha = faFileLines;
  protected readonly t = inject(TraduccionService).t;

  /**
   * Cada declaración con su destinatario ya resuelto.
   *
   * <p>El nombre y el país se sacaban desde la plantilla, bulto a bulto y en cada repintado; el país
   * además recorría la lista entera para dar con el rótulo. Aquí se hace una vez por declaración.
   */
  protected readonly fichas = computed(() =>
    this.declaraciones().map((declaracion) => ({
      declaracion,
      nombre: nombreDeclarado(declaracion.destinatario),
      pais: declaracion.destinatario?.pais ? nombreDePais(declaracion.destinatario.pais) : '—',
    })),
  );

  protected valor = valorDeclarado;
}
