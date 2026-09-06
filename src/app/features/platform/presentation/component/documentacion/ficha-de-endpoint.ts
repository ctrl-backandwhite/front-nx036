import { Component, computed, inject, input } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { FichaDeEndpoint } from '../../../domain/model/referencia-api';
import { BloqueDeCodigo } from './bloque-de-codigo';
import { BloqueDeUrl } from './bloque-de-url';
import { PestanasDeCodigo } from './pestanas-de-codigo';

/**
 * La línea de un endpoint: el método, la dirección y si se puede repetir sin duplicar el efecto.
 *
 * <p>El color del método no es adorno: en una página con treinta endpoints es lo que permite localizar
 * de un vistazo los tres que escriben algo entre los veintisiete que solo leen.
 */
@Component({
  selector: 'nx-linea-de-endpoint',
  imports: [BloqueDeUrl],
  template: `
    <div class="flex items-center gap-2 my-3">
      <span class="badge text-[11px]" [class]="clasesDelMetodo()">{{ metodo() }}</span>
      <nx-bloque-de-url [url]="ruta()" [compacto]="true" />
      @if (idempotente()) {
        <span class="badge bg-ink-100 text-ink-700 text-[10px]">idempotent</span>
      }
    </div>
  `,
})
export class LineaDeEndpoint {
  readonly metodo = input.required<string>();
  readonly ruta = input.required<string>();
  readonly idempotente = input(false);

  protected readonly clasesDelMetodo = computed(() => {
    const colores: Readonly<Record<string, string>> = {
      GET: 'bg-brand-100 text-brand-800',
      POST: 'bg-emerald-100 text-emerald-700',
      PUT: 'bg-amber-100 text-amber-700',
      DELETE: 'bg-red-100 text-red-700',
    };
    return colores[this.metodo()] ?? 'bg-ink-100 text-ink-700';
  });
}

/**
 * La ficha completa de un endpoint: línea, explicación, parámetros, petición y respuesta.
 *
 * <p>Una sola pieza para los treinta y pico endpoints de la referencia. Cuando cada uno tenía su
 * marcado, los parámetros salían en tres formatos distintos según qué día se hubiera escrito.
 *
 * <p>MOBILE FIRST: la tabla de parámetros se desplaza dentro de su caja; la página, no.
 */
@Component({
  selector: 'nx-ficha-de-endpoint',
  imports: [LineaDeEndpoint, PestanasDeCodigo, BloqueDeCodigo],
  template: `
    <div class="border border-ink-100 rounded-md p-4 my-4 bg-white">
      <nx-linea-de-endpoint
        [metodo]="ficha().metodo"
        [ruta]="ficha().ruta"
        [idempotente]="!!ficha().idempotente"
      />

      @if (ficha().claveIntro; as clave) {
        <p class="text-[13px] text-ink-700 mt-1 mb-2">{{ t(clave) }}</p>
      }

      @if (parametros().length > 0) {
        <div class="my-3 overflow-hidden rounded-md border border-ink-100">
          <div class="overflow-x-auto">
            <table class="w-full text-[12px]">
              <thead class="bg-ink-50 text-ink-500 text-left">
                <tr>
                  <th class="px-3 py-1.5 font-medium">{{ t('docs.col.name') }}</th>
                  <th class="px-3 py-1.5 font-medium">{{ t('docs.col.type') }}</th>
                  <th class="px-3 py-1.5 font-medium">{{ t('docs.required') }}</th>
                  <th class="px-3 py-1.5 font-medium">{{ t('docs.col.description') }}</th>
                </tr>
              </thead>
              <tbody>
                @for (parametro of parametros(); track parametro.nombre) {
                  <tr class="border-t border-ink-100">
                    <td class="px-3 py-1.5 font-mono">{{ parametro.nombre }}</td>
                    <td class="px-3 py-1.5 text-ink-500">{{ parametro.tipo }}</td>
                    <td class="px-3 py-1.5">
                      @if (parametro.obligatorio) {
                        <span class="badge bg-red-50 text-red-700">{{ t('docs.required') }}</span>
                      } @else {
                        <span class="badge bg-ink-100 text-ink-600">{{ t('docs.optional') }}</span>
                      }
                    </td>
                    <td class="px-3 py-1.5 text-ink-700">{{ parametro.descripcion }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      @if (ficha().peticion; as peticion) {
        <div class="my-3 space-y-3">
          <div>
            <div class="text-[11px] uppercase tracking-wider text-ink-500 font-medium mb-1.5 mt-3">
              {{ t('docs.example_request') }}
            </div>
            <nx-pestanas-de-codigo [ejemplos]="peticion" />
          </div>
          @if (ficha().respuesta; as respuesta) {
            <div>
              <div class="text-[11px] uppercase tracking-wider text-ink-500 font-medium mb-1.5 mt-3">
                {{ t('docs.example_response') }}
              </div>
              <nx-bloque-de-codigo [codigo]="respuesta" />
            </div>
          }
        </div>
      } @else if (ficha().respuesta; as respuesta) {
        <!-- Sin petición de ejemplo, la respuesta se enseña sola: el endpoint no lleva parámetros. -->
        <div class="text-[11px] uppercase tracking-wider text-ink-500 font-medium mb-1.5 mt-3">
          {{ t('docs.example_response') }}
        </div>
        <nx-bloque-de-codigo [codigo]="respuesta" />
      }
    </div>
  `,
})
export class FichaDeEndpointComponent {
  readonly ficha = input.required<FichaDeEndpoint>();

  protected readonly t = inject(TraduccionService).t;
  protected readonly parametros = computed(() => this.ficha().parametros ?? []);
}
