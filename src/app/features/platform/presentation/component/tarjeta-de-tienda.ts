import { Component, inject, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faRotate, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { TiendaConectada } from '../../domain/model/tienda';

/**
 * Una tienda conectada, con sus dos acciones.
 *
 * <p>El mensaje y el error de la última sincronización se pintan aquí y no se esconden tras un icono:
 * son lo que explica por qué una tienda tiene cero productos publicados, y esa es exactamente la
 * pregunta que llegaba a soporte.
 */
@Component({
  selector: 'nx-tarjeta-de-tienda',
  imports: [FaIconComponent],
  template: `
    <div class="card p-4">
      <div class="flex items-baseline justify-between">
        <div class="text-[11px] uppercase tracking-wider text-brand-700 font-medium">
          {{ tienda().plataforma }}
        </div>
        <span
          class="badge"
          [class.bg-emerald-100]="conectada()"
          [class.text-emerald-700]="conectada()"
          [class.bg-amber-100]="!conectada()"
          [class.text-amber-700]="!conectada()"
        >
          {{ t('shops.status.' + tienda().estado) }}
        </span>
      </div>

      <div class="font-medium mt-1 truncate">{{ tienda().identificador }}</div>
      <div class="text-[11px] text-ink-500 mt-1">
        {{ tienda().publicaciones }} {{ t('shops.listings').toLowerCase() }}
      </div>

      @if (tienda().ultimaSincronizacion; as fecha) {
        <div class="text-[11px] text-ink-400 mt-1">sync {{ fechaLegible(fecha) }}</div>
      }
      @if (tienda().mensajeDeSincronizacion; as mensaje) {
        <div class="text-[11px] text-ink-600 mt-1">{{ mensaje }}</div>
      }
      @if (tienda().errorDeSincronizacion; as error) {
        <div role="alert" class="text-[11px] text-red-600 mt-0.5 wrap-break-word">{{ error }}</div>
      }

      <div class="flex gap-2 mt-3">
        <button type="button" class="btn btn-outline text-[11px]" (click)="sincroniza.emit()">
          <fa-icon [icon]="iconos.sincronizar" /> {{ t('shops.action.sync') }}
        </button>
        <button
          type="button"
          class="btn btn-outline text-[11px] text-red-600"
          (click)="desconecta.emit()"
        >
          <fa-icon [icon]="iconos.papelera" /> {{ t('shops.action.disconnect') }}
        </button>
      </div>
    </div>
  `,
})
export class TarjetaDeTienda {
  readonly tienda = input.required<TiendaConectada>();
  readonly sincroniza = output<void>();
  readonly desconecta = output<void>();

  protected readonly iconos = { sincronizar: faRotate, papelera: faTrashCan };
  protected readonly t = inject(TraduccionService).t;

  protected conectada(): boolean {
    return this.tienda().estado === 'CONNECTED';
  }

  /**
   * La fecha en el formato de quien mira.
   *
   * <p>Se calcula al pintar y no se guarda: esta pantalla no se prerenderiza —depende de quién mira—,
   * así que no hay riesgo de que el HTML escrito al construir lleve la hora de otro huso.
   */
  protected fechaLegible(fecha: string): string {
    const cuando = new Date(fecha);
    return Number.isNaN(cuando.getTime()) ? fecha : cuando.toLocaleString();
  }
}
