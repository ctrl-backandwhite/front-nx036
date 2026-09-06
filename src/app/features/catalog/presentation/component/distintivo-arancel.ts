import { Component, computed, inject, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCircleCheck, faFileInvoiceDollar } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { ArancelDelProducto } from '../../domain/model/producto';

/**
 * Cuánto arancel SUMA llevarse este producto, con la cesta actual como referencia.
 *
 * <p>Se pinta igual en la tarjeta y en la ficha porque lo calcula el mismo servicio del backend: si
 * cada pantalla lo compusiera, una acabaría prometiendo algo que la otra no.
 *
 * <p>Sin referencia —cesta vacía, o país que no cobra derecho por artículo— no se pinta NADA: un
 * mensaje sobre lo que suma respecto de nada no significa nada.
 */
@Component({
  selector: 'nx-distintivo-arancel',
  imports: [FaIconComponent],
  template: `
    @if (arancel().centimosExtra !== null) {
      <div class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        @if (arancel().centimosExtra === 0) {
          <span class="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
            <fa-icon [icon]="iconoSinCoste" class="text-[10px]" />
            {{ t('catalog.duty.free') }}
          </span>
        } @else {
          <span class="inline-flex items-center gap-1 text-[11px] text-ink-500">
            <fa-icon [icon]="iconoConCoste" class="text-[10px]" />
            {{ textoDelExtra() }}
          </span>
        }
        @if (arancel().grupo) {
          <!--
            Un BOTÓN y no un enlace: la tarjeta entera ya es un enlace, y anidar uno dentro es HTML
            inválido — el navegador lo saca del padre y la tarjeta deja de ser pulsable entera.
          -->
          <button
            type="button"
            (click)="filtra.emit(); $event.preventDefault(); $event.stopPropagation()"
            class="text-[11px] underline text-brand-700 hover:text-brand-800"
          >
            {{ t('catalog.duty.filter') }}
          </button>
        }
      </div>
    }
  `,
})
export class DistintivoArancel {
  readonly arancel = input.required<ArancelDelProducto>();
  readonly filtra = output<void>();

  private readonly traduccion = inject(TraduccionService);
  protected readonly t = this.traduccion.t;
  protected readonly iconoSinCoste = faCircleCheck;
  protected readonly iconoConCoste = faFileInvoiceDollar;

  /** El importe llega FORMATEADO del backend, igual que el precio: aquí solo se coloca en la frase. */
  protected readonly textoDelExtra = computed(() =>
    this.traduccion.tCon('catalog.duty.extra', {
      amount: this.arancel().formateado ?? '',
    }),
  );
}
