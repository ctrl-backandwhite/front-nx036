import { Component, inject, input } from '@angular/core';
import { CookieRow } from '@shared/content/legal-pages';
import { TraduccionService } from '@core/i18n/traduccion.service';

/**
 * Las cookies concretas, una por una.
 *
 * <p>Describir solo categorías en abstracto —«necesarias», «analíticas»— no cumple: hay que decir qué
 * cookie es, quién la pone, para qué sirve y cuánto dura. Es lo que permite a alguien comprobar que lo
 * que decimos coincide con lo que su navegador guarda.
 */
@Component({
  selector: 'nx-tabla-cookies',
  template: `
    @if (filas().length > 0) {
      <section class="mx-auto max-w-4xl px-4 pb-12">
        <h2 class="text-lg font-medium text-slate-900 mb-3">{{ t('cookies.table.title') }}</h2>
        <!-- La tabla se desborda en móvil: que se desplace ella y no la página entera. -->
        <div class="overflow-x-auto rounded-box border border-ink-100">
          <table class="table table-sm">
            <thead>
              <tr>
                <th>{{ t('cookies.table.name') }}</th>
                <th>{{ t('cookies.table.owner') }}</th>
                <th>{{ t('cookies.table.purpose') }}</th>
                <th>{{ t('cookies.table.duration') }}</th>
                <th>{{ t('cookies.table.category') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (fila of filas(); track fila.name) {
                <tr>
                  <td class="font-mono text-[12px] whitespace-nowrap">{{ fila.name }}</td>
                  <td class="whitespace-nowrap">{{ fila.owner }}</td>
                  <td class="text-[13px] leading-relaxed">{{ fila.purpose }}</td>
                  <td class="whitespace-nowrap">{{ fila.duration }}</td>
                  <td class="whitespace-nowrap">{{ fila.category }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    }
  `,
})
export class TablaCookies {
  readonly filas = input<readonly CookieRow[]>([]);
  protected readonly t = inject(TraduccionService).t;
}
