import { Component, inject } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import {
  AVISOS_DE_PEDIDO,
  CICLO_DEL_PEDIDO,
  CODIGOS_DE_ERROR,
  URL_DE_PRODUCCION,
  URL_DE_PRUEBAS,
  soloLaExplicacion,
} from '../../../domain/model/referencia-api';

/**
 * Las cuatro tablas fijas de la referencia: avisos, errores, ciclo del pedido y entornos.
 *
 * <p>Van juntas en un fichero porque son la misma cosa —una lista corta de datos con dos columnas— y
 * porque ninguna llega a treinta líneas. Separarlas en cuatro ficheros habría multiplicado los
 * imports sin que nadie las reutilice por separado.
 *
 * <p>MOBILE FIRST: todas se desplazan dentro de su propia caja.
 */
@Component({
  selector: 'nx-tabla-de-avisos',
  template: `
    <div class="overflow-hidden rounded-md border border-ink-100 my-3">
      <div class="overflow-x-auto">
        <table class="w-full text-[12px]">
          <thead class="bg-ink-50 text-ink-500 text-left">
            <tr>
              <th class="px-3 py-1.5 font-medium">{{ t('docs.col.event') }}</th>
              <th class="px-3 py-1.5 font-medium">{{ t('docs.col.description') }}</th>
            </tr>
          </thead>
          <tbody>
            @for (aviso of avisos; track aviso.nombre) {
              <tr class="border-t border-ink-100">
                <td class="px-3 py-1.5 font-mono">{{ aviso.nombre }}</td>
                <td class="px-3 py-1.5 text-ink-700">{{ explicacion(aviso.clave) }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class TablaDeAvisos {
  protected readonly avisos = AVISOS_DE_PEDIDO;
  protected readonly t = inject(TraduccionService).t;

  /** El diccionario guarda «nombre — explicación» y el nombre ya está en su columna. */
  protected explicacion(clave: string): string {
    return soloLaExplicacion(this.t(clave));
  }
}

@Component({
  selector: 'nx-tabla-de-errores',
  template: `
    <div class="overflow-hidden rounded-md border border-ink-100 my-3">
      <div class="overflow-x-auto">
        <table class="w-full text-[12px]">
          <thead class="bg-ink-50 text-ink-500 text-left">
            <tr>
              <th class="px-3 py-1.5 font-medium">{{ t('docs.col.code') }}</th>
              <th class="px-3 py-1.5 font-medium w-16">HTTP</th>
              <th class="px-3 py-1.5 font-medium">{{ t('docs.col.meaning') }}</th>
            </tr>
          </thead>
          <tbody>
            @for (error of errores; track error.codigo) {
              <tr class="border-t border-ink-100">
                <td class="px-3 py-1.5 font-mono">{{ error.codigo }}</td>
                <td class="px-3 py-1.5 text-ink-500">{{ error.estado }}</td>
                <td class="px-3 py-1.5 text-ink-700">{{ explicacion(error.clave) }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class TablaDeErrores {
  protected readonly errores = CODIGOS_DE_ERROR;
  protected readonly t = inject(TraduccionService).t;

  protected explicacion(clave: string): string {
    return soloLaExplicacion(this.t(clave));
  }
}

@Component({
  selector: 'nx-ciclo-del-pedido',
  template: `
    <ol class="space-y-2.5">
      @for (parada of paradas; track parada.nombre; let i = $index) {
        <li class="flex items-start gap-3 text-[13px]">
          <span
            class="shrink-0 w-6 h-6 rounded-full bg-brand-100 text-brand-700 font-medium inline-flex items-center justify-center text-[11px]"
          >
            {{ i + 1 }}
          </span>
          <div>
            <code class="text-brand-700">{{ parada.nombre }}</code>
            <span class="text-ink-700 ml-2">{{ explicacion(parada.clave) }}</span>
          </div>
        </li>
      }
    </ol>
  `,
})
export class CicloDelPedido {
  protected readonly paradas = CICLO_DEL_PEDIDO;
  protected readonly t = inject(TraduccionService).t;

  protected explicacion(clave: string): string {
    return soloLaExplicacion(this.t(clave));
  }
}

@Component({
  selector: 'nx-tabla-de-entornos',
  template: `
    <div class="overflow-hidden rounded-md border border-ink-100 my-4">
      <div class="overflow-x-auto">
        <table class="w-full text-[12px]">
          <thead class="bg-ink-50 text-ink-500 text-left">
            <tr>
              <th class="px-3 py-1.5 font-medium">{{ t('docs.environments') }}</th>
              <th class="px-3 py-1.5 font-medium">{{ t('docs.base_url') }}</th>
              <th class="px-3 py-1.5 font-medium">{{ t('common.status') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-t border-ink-100">
              <td class="px-3 py-1.5 font-medium">{{ t('docs.env.sandbox') }}</td>
              <td class="px-3 py-1.5"><code>{{ pruebas }}</code></td>
              <td class="px-3 py-1.5">
                <span class="badge bg-emerald-100 text-emerald-700">OK</span>
              </td>
            </tr>
            <tr class="border-t border-ink-100">
              <td class="px-3 py-1.5 font-medium">{{ t('docs.env.production') }}</td>
              <td class="px-3 py-1.5"><code>{{ produccion }}</code></td>
              <td class="px-3 py-1.5">
                <span class="badge bg-amber-100 text-amber-700">Beta</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class TablaDeEntornos {
  protected readonly pruebas = URL_DE_PRUEBAS;
  protected readonly produccion = URL_DE_PRODUCCION;
  protected readonly t = inject(TraduccionService).t;
}
