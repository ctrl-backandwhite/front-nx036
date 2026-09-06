import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AjusteDeMoq } from '../../../domain/gestion/model/precios';

/**
 * El ajuste por pedido mínimo.
 *
 * <p>No es una fila más de la tabla de reglas: es una palanca aparte que reduce al porcentaje indicado
 * el margen de los productos que hay que comprar en más de una unidad. Por eso tiene tarjeta propia.
 *
 * <p>Lo tecleado vive en un BORRADOR hasta que se guarda, y el botón solo se habilita si hay algo que
 * guardar: así mover el interruptor sin querer no cambia el margen de medio catálogo. Cuando llega un
 * ajuste nuevo del servidor —al guardar, o al recargar— el borrador se descarta solo.
 *
 * <p>MOBILE FIRST: en el móvil el texto y los controles van apilados; a partir de `sm:` se colocan en
 * una fila con el botón a la derecha.
 */
@Component({
  selector: 'nx-precios-ajuste-moq',
  template: `
    @if (vista(); as ajuste) {
      <div class="card p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
          <h2 class="font-semibold">{{ t('admin.pricing.moq.title') }}</h2>
          <p class="text-[12px] text-ink-500 mt-0.5">{{ t('admin.pricing.moq.desc') }}</p>
        </div>
        <div class="flex items-center gap-3 flex-wrap">
          <label for="moq-factor" class="flex items-center gap-2 text-[13px]">
            {{ t('admin.pricing.moq.reduce_to') }}
            <input
              id="moq-factor"
              type="number"
              min="0"
              max="100"
              class="input input-bordered input-sm w-20"
              [value]="ajuste.factorPorcentaje"
              (input)="cambiaFactor($event)"
            />
            <span>%</span>
          </label>
          <label for="moq-activo" class="flex items-center gap-2 text-[13px] cursor-pointer">
            <input
              id="moq-activo"
              type="checkbox"
              class="toggle toggle-primary toggle-sm"
              [checked]="ajuste.activo"
              (change)="cambiaActivo($event)"
            />
            {{ ajuste.activo ? t('admin.pricing.moq.on') : t('admin.pricing.moq.off') }}
          </label>
          <button
            type="button"
            class="btn btn-primary btn-sm"
            [disabled]="guardando() || borrador() === null"
            (click)="guarda.emit(ajuste)"
          >
            {{ t('actions.save') }}
          </button>
        </div>
      </div>
    }
  `,
})
export class PreciosAjusteMoq {
  readonly ajuste = input<AjusteDeMoq | null>(null);
  readonly guardando = input(false);
  readonly guarda = output<AjusteDeMoq>();

  protected readonly t = inject(TraduccionService).t;

  /**
   * Lo tecleado sin confirmar. Se pone a nulo cada vez que entra un ajuste distinto del servidor, que es
   * lo que hace que tras guardar el botón vuelva a quedarse apagado sin que nadie tenga que avisarlo.
   */
  protected readonly borrador = linkedSignal<AjusteDeMoq | null, AjusteDeMoq | null>({
    source: () => this.ajuste(),
    computation: () => null,
  });

  /** Lo que se pinta: el borrador si se ha tocado algo, y si no lo que dijo el servidor. */
  protected readonly vista = computed(() => this.borrador() ?? this.ajuste());

  protected cambiaFactor(evento: Event): void {
    const valor = Number((evento.target as HTMLInputElement).value);
    const actual = this.vista();
    if (!actual) {
      return;
    }
    this.borrador.set({
      activo: actual.activo,
      factorPorcentaje: Number.isFinite(valor) ? valor : 0,
    });
  }

  protected cambiaActivo(evento: Event): void {
    const actual = this.vista();
    if (!actual) {
      return;
    }
    this.borrador.set({
      activo: (evento.target as HTMLInputElement).checked,
      factorPorcentaje: actual.factorPorcentaje,
    });
  }
}
