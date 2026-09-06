import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { FormField, form, max, min, required } from '@angular/forms/signals';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AjusteDeMoq } from '../../../domain/gestion/model/precios';

/** Lo que se teclea. El porcentaje puede quedarse vacío mientras se escribe, y vacío no es cero. */
interface BorradorDeMoq {
  factorPorcentaje: number | null;
  activo: boolean;
}

/**
 * El ajuste por pedido mínimo.
 *
 * <p>No es una fila más de la tabla de reglas: es una palanca aparte que reduce al porcentaje indicado
 * el margen de los productos que hay que comprar en más de una unidad. Por eso tiene tarjeta propia.
 *
 * <p>Lo tecleado vive en un BORRADOR hasta que se guarda, y el botón solo se habilita si hay algo que
 * guardar y lo tecleado es válido: así mover el interruptor sin querer no cambia el margen de medio
 * catálogo, y un porcentaje fuera de rango no llega a salir. Cuando llega un ajuste nuevo del servidor
 * —al guardar, o al recargar— el borrador se descarta solo.
 *
 * <p>El rango 0–100 lo declara el ESQUEMA y la directiva lo proyecta al campo: antes estaba escrito como
 * atributo en la plantilla y no lo comprobaba nadie, así que teclear 500 se guardaba tal cual.
 *
 * <p>MOBILE FIRST: en el móvil el texto y los controles van apilados; a partir de `sm:` se colocan en
 * una fila con el botón a la derecha.
 */
@Component({
  selector: 'nx-precios-ajuste-moq',
  imports: [FormField],
  template: `
    @if (ajuste()) {
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
              class="input input-bordered input-sm w-20"
              [formField]="formulario.factorPorcentaje"
            />
            <span>%</span>
          </label>
          <label for="moq-activo" class="flex items-center gap-2 text-[13px] cursor-pointer">
            <input
              id="moq-activo"
              type="checkbox"
              class="toggle toggle-primary toggle-sm"
              [formField]="formulario.activo"
            />
            {{ modelo().activo ? t('admin.pricing.moq.on') : t('admin.pricing.moq.off') }}
          </label>
          <button
            type="button"
            class="btn btn-primary btn-sm"
            [disabled]="guardando() || !hayCambios() || formulario().invalid()"
            (click)="guarda.emit(ajusteEditado())"
          >
            {{ t('actions.save') }}
          </button>
        </div>
      </div>
      @if (formulario.factorPorcentaje().touched() && formulario.factorPorcentaje().errors().length) {
        <p role="alert" class="text-[11px] text-error mt-1">
          {{ formulario.factorPorcentaje().errors()[0].message }}
        </p>
      }
    }
  `,
})
export class PreciosAjusteMoq {
  readonly ajuste = input<AjusteDeMoq | null>(null);
  readonly guardando = input(false);
  readonly guarda = output<AjusteDeMoq>();

  protected readonly t = inject(TraduccionService).t;

  /**
   * Lo tecleado. Se rehace cada vez que entra un ajuste distinto del servidor, que es lo que hace que
   * tras guardar el botón vuelva a quedarse apagado sin que nadie tenga que avisarlo.
   */
  protected readonly modelo = linkedSignal<BorradorDeMoq>(() => ({
    factorPorcentaje: this.ajuste()?.factorPorcentaje ?? 0,
    activo: this.ajuste()?.activo ?? false,
  }));

  protected readonly formulario = form(this.modelo, (ruta) => {
    required(ruta.factorPorcentaje, { message: () => this.t('dialog.field.required') });
    min(ruta.factorPorcentaje, 0, { message: () => this.t('dialog.field.min') });
    max(ruta.factorPorcentaje, 100, { message: () => this.t('dialog.field.number') });
  });

  /** Solo se guarda lo que de verdad ha cambiado respecto a lo que dijo el servidor. */
  protected readonly hayCambios = computed(() => {
    const servidor = this.ajuste();
    const borrador = this.modelo();
    return (
      !!servidor &&
      (servidor.activo !== borrador.activo ||
        servidor.factorPorcentaje !== borrador.factorPorcentaje)
    );
  });

  /** Lo que sale de la tarjeta. El nulo no llega aquí: con él el botón está apagado. */
  protected readonly ajusteEditado = computed<AjusteDeMoq>(() => ({
    activo: this.modelo().activo,
    factorPorcentaje: this.modelo().factorPorcentaje ?? 0,
  }));
}
