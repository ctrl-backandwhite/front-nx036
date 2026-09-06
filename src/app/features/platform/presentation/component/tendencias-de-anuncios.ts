import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TraduccionService } from '@core/i18n/traduccion.service';
import {
  TendenciaDeAnuncio,
  maximoDeInteracciones,
  puntuacionSobreCien,
  resumePorFuente,
} from '../../domain/model/inteligencia';

/**
 * Lo que se está anunciando: el resumen por fuente y la tabla de titulares.
 *
 * <p>El resumen y el máximo se calculan en el dominio, no aquí. La plantilla se limita a pintar, que es
 * lo que permite probar el agrupado sin montar una tabla — y lo que evita que la barra de progreso
 * dividiera entre cero con un conjunto recién capturado.
 *
 * <p>MOBILE FIRST: las tarjetas del resumen arrancan en dos columnas y llegan a cuatro; la tabla se
 * desplaza dentro de su propio contenedor para que la página no se desplace en horizontal.
 */
@Component({
  selector: 'nx-tendencias-de-anuncios',
  imports: [RouterLink],
  template: `
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
        @for (resumen of porFuente(); track resumen.fuente) {
          <button
            type="button"
            class="card p-3 text-left"
            [class.border-brand-300]="fuente() === resumen.fuente"
            [class.bg-brand-50]="fuente() === resumen.fuente"
            (click)="cambiaFuente.emit(resumen.fuente)"
          >
            <div class="text-[11px] uppercase tracking-wider text-ink-500">{{ resumen.fuente }}</div>
            <div class="mt-1 text-lg font-medium">{{ resumen.cuantos }}</div>
            <div class="mt-1 h-1.5 rounded-full bg-ink-100 overflow-hidden">
              <div class="h-full bg-brand-500" [style.width.%]="anchura(resumen.interacciones)"></div>
            </div>
            <div class="text-[10px] text-ink-500 mt-0.5">
              {{ resumen.interacciones.toLocaleString() }} {{ t('intel.engagement') }}
            </div>
          </button>
        }
      </div>

      <div class="flex gap-1.5 flex-wrap">
        @for (opcion of fuentes; track opcion) {
          <button
            type="button"
            class="chip"
            [class.chip-active]="opcion === fuente()"
            (click)="cambiaFuente.emit(opcion)"
          >
            {{ opcion || t('intel.all') }}
          </button>
        }
      </div>

      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-ink-50 text-ink-500 text-left text-[12px]">
              <tr>
                <th class="px-3 py-2 font-medium">{{ t('intel.col.source') }}</th>
                <th class="px-3 py-2 font-medium">{{ t('intel.col.headline') }}</th>
                <th class="px-3 py-2 font-medium text-right">{{ t('intel.col.score') }}</th>
                <th class="px-3 py-2 font-medium text-right">{{ t('intel.col.engagement') }}</th>
                <th class="px-3 py-2 font-medium">{{ t('intel.col.region') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (fila of tendencias(); track fila.id) {
                <tr class="border-t border-ink-100 hover:bg-ink-50/50">
                  <td class="px-3 py-2 text-[11px] uppercase">{{ fila.fuente }}</td>
                  <td class="px-3 py-2 text-[13px]">
                    @if (fila.slugDeProducto; as slug) {
                      <a [routerLink]="['/catalog', slug]" class="hover:text-brand-700">
                        {{ fila.titular }}
                      </a>
                    } @else {
                      {{ fila.titular }}
                    }
                  </td>
                  <!--
                    La puntuación se recorta en el dominio: hay filas antiguas guardadas en la escala
                    de 0 a 100 y mezclarlas sin mirar pintaba «6000/100».
                  -->
                  <td class="px-3 py-2 text-right font-medium">{{ puntuacion(fila) }}/100</td>
                  <td class="px-3 py-2 text-right text-[12px]">
                    {{ (fila.interacciones ?? 0).toLocaleString() }}
                  </td>
                  <td class="px-3 py-2 text-[12px] text-ink-500">{{ fila.region ?? '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class TendenciasDeAnuncios {
  readonly tendencias = input<readonly TendenciaDeAnuncio[]>([]);
  readonly fuente = input('');
  readonly cambiaFuente = output<string>();

  protected readonly t = inject(TraduccionService).t;

  /** La cadena vacía es «todas»: se pinta con su propia etiqueta traducida. */
  protected readonly fuentes: readonly string[] = [
    '',
    'tiktok',
    'facebook',
    'instagram',
    'pinterest',
    'youtube',
    'amazon',
  ];

  protected readonly porFuente = computed(() => resumePorFuente(this.tendencias()));
  private readonly maximo = computed(() => maximoDeInteracciones(this.porFuente()));

  protected anchura(interacciones: number): number {
    return (interacciones / this.maximo()) * 100;
  }

  protected puntuacion(tendencia: TendenciaDeAnuncio): number {
    return puntuacionSobreCien(tendencia.puntuacion);
  }
}
