import { Component, inject, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBoxOpen } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { Bulto } from '../../domain/model/seguimiento';
import { PasosDeSeguimiento } from './pasos-de-seguimiento';

/**
 * Un paquete del pedido: cabecera con su guía y su peso, y debajo sus propios pasos.
 *
 * <p>Cada bulto se enseña por separado porque cada guía avanza a su ritmo; mezclarlos en una sola lista
 * haría imposible saber qué le pasa a cada uno.
 */
@Component({
  selector: 'nx-bulto-de-envio',
  imports: [FaIconComponent, PasosDeSeguimiento],
  template: `
    <div class="rounded-lg border border-base-300 p-4">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span class="flex items-center gap-2 text-sm font-medium">
          <fa-icon [icon]="iconoBulto" class="text-ink-500" />
          {{ t('tracking.parcel') }} {{ bulto().secuencia }}/{{ total() }}
          @if (bulto().pesoGramos > 0) {
            <span class="text-xs text-ink-500">· {{ kilos() }} kg</span>
          }
        </span>
        @if (bulto().numeroDeSeguimiento) {
          <span class="text-[11px] font-mono bg-base-200 rounded px-2 py-1">
            {{ bulto().numeroDeSeguimiento }}
          </span>
        }
      </div>

      <!--
        Qué va dentro. Sin esto, «Paquete 1/2» no decía nada: quien recibe uno no sabe a qué le está
        siguiendo la pista. Los envíos anteriores a que se guardara el reparto no traen contenido y se
        pintan como antes.
      -->
      @if (bulto().contenido.length > 0) {
        <div class="mb-3 flex flex-wrap gap-2">
          @for (articulo of bulto().contenido; track $index) {
            <div class="flex items-center gap-2 rounded bg-base-200/60 py-1 pl-1 pr-2">
              @if (articulo.imagenUrl) {
                <img [src]="articulo.imagenUrl" alt="" loading="lazy" class="h-9 w-9 rounded object-cover" />
              }
              <span class="max-w-[10rem] truncate text-xs" [title]="articulo.titulo">
                {{ articulo.titulo }}
                @if (articulo.variante) {
                  <span class="text-ink-500"> · {{ articulo.variante }}</span>
                }
              </span>
              <span class="text-xs font-medium text-ink-500">×{{ articulo.cantidad }}</span>
            </div>
          }
        </div>
      }

      @if (bulto().entregaEstimadaEl; as fecha) {
        <div class="text-xs text-ink-500 mb-2">
          {{ t('tracking.eta') }}: <strong>{{ soloFecha(fecha) }}</strong>
        </div>
      }

      @if (bulto().hitos.length === 0) {
        <p class="text-sm text-ink-500">{{ t('tracking.empty') }}</p>
      } @else {
        <nx-pasos-de-seguimiento [hitos]="bulto().hitos" />
      }
    </div>
  `,
})
export class BultoDeEnvio {
  readonly bulto = input.required<Bulto>();
  /** Cuántos bultos tiene el pedido: es la segunda mitad del «1/2». */
  readonly total = input.required<number>();

  protected readonly iconoBulto = faBoxOpen;
  protected readonly t = inject(TraduccionService).t;

  protected kilos(): string {
    return (this.bulto().pesoGramos / 1000).toFixed(2);
  }

  protected soloFecha(valor: string): string {
    return new Date(valor).toLocaleDateString();
  }
}
