import { Component, inject, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPlug } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PlataformaDeTienda, inicialDePlataforma } from '../../domain/model/tienda';

/**
 * Lo que se enseña cuando no hay ninguna tienda conectada.
 *
 * <p>No es un mensaje de «no hay nada»: es el mosaico de integraciones y los tres pasos del proceso.
 * Una lista vacía sin salida es un callejón; desde aquí se empieza pulsando una plataforma.
 *
 * <p>MOBILE FIRST: el mosaico arranca en dos columnas —que es lo que cabe en un móvil sin que el
 * nombre de la plataforma se corte— y crece a tres y a seis. Los tres pasos van apilados y pasan a
 * tres columnas a partir de `sm`.
 */
@Component({
  selector: 'nx-tiendas-vacias',
  imports: [FaIconComponent],
  template: `
    <div class="card p-10">
      <div class="text-center">
        <fa-icon [icon]="iconoEnchufe" class="text-4xl text-ink-300 mb-3" />
        <h2 class="font-medium text-lg">{{ t('shops.empty.title') }}</h2>
        <p class="text-sm text-ink-500 mt-1 max-w-md mx-auto">{{ t('shops.empty.body') }}</p>
      </div>

      <div class="mt-8">
        <div class="text-[11px] uppercase tracking-wider text-ink-500 font-medium mb-3 text-center">
          {{ t('shops.empty.integrations') }}
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          @for (opcion of plataformas(); track opcion.codigo) {
            <button
              type="button"
              [class]="clasesDeTarjeta(opcion.disponible)"
              [disabled]="!opcion.disponible"
              (click)="elige.emit(opcion.codigo)"
            >
              <div
                class="text-2xl font-bold"
                [class.text-brand-600]="opcion.disponible"
                [class.text-ink-400]="!opcion.disponible"
              >
                {{ inicialDe(opcion) }}
              </div>
              <div class="text-[12px] mt-1 font-medium truncate">{{ opcion.etiqueta }}</div>
              @if (!opcion.disponible) {
                <div class="text-[10px] mt-1 text-amber-600 font-medium">
                  {{ t('shops.coming_soon') }}
                </div>
              }
            </button>
          }
        </div>
      </div>

      <div class="mt-8 grid gap-3 text-center sm:grid-cols-3">
        @for (paso of pasos; track paso) {
          <div class="text-[12px] text-ink-600">
            <div class="font-medium text-ink-800">{{ t(paso + '.title') }}</div>
            <div class="text-ink-500 mt-1">{{ t(paso + '.body') }}</div>
          </div>
        }
      </div>
    </div>
  `,
})
export class TiendasVacias {
  readonly plataformas = input.required<readonly PlataformaDeTienda[]>();
  readonly elige = output<string>();

  protected readonly pasos = ['shops.empty.step1', 'shops.empty.step2', 'shops.empty.step3'];
  protected readonly iconoEnchufe = faPlug;
  protected readonly t = inject(TraduccionService).t;

  /**
   * Las clases de una tarjeta, en UNA cadena: `hover:border-brand-300` lleva dos puntos, y ese
   * carácter rompe el analizador de plantillas dentro de un `[class.x]`.
   */
  protected clasesDeTarjeta(disponible: boolean): string {
    const comunes = 'card p-4 text-center transition-all relative';
    return disponible
      ? `${comunes} hover:border-brand-300 hover:shadow-sm`
      : `${comunes} opacity-60 cursor-not-allowed`;
  }

  protected inicialDe(plataforma: PlataformaDeTienda): string {
    return inicialDePlataforma(plataforma);
  }
}
