import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { FormField, form, min, required } from '@angular/forms/signals';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import {
  ConsultaLosServiciosDeAlmacen,
  GuardaLosServiciosDeAlmacen,
} from '../../../application/gestion/use-case/precios.use-case';
import { ServiciosDeAlmacen } from '../../../domain/gestion/model/precios';

/** Lo que se teclea. Vacío no es cero: un campo vacío no se guarda. */
interface BorradorDeServicios {
  etiquetadoCny: number | null;
  reempaquetadoCny: number | null;
}

/**
 * Los servicios de almacén: etiquetado y reempaquetado.
 *
 * <p>Dos importes GLOBALES en yuanes por unidad vendida que el backend suma al precio de todo producto
 * que no tenga el suyo propio (el propio se pone en la ficha). Aquí no se calcula ningún precio: solo
 * se guardan los dos importes, y el backend es quien los convierte y los reparte por el desglose.
 *
 * <p>Se carga y se guarda por su cuenta, como una palanca aparte de las reglas de margen. Lo tecleado
 * vive en un borrador y el botón solo se habilita con cambios válidos (≥ 0, ambos obligatorios).
 */
@Component({
  // Nace en BLOQUE: un elemento personalizado es `inline` por defecto.
  host: { class: 'block' },
  selector: 'nx-precios-servicios-de-almacen',
  imports: [FormField],
  template: `
    @if (servidor()) {
      <div class="card p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
          <h2 class="font-semibold">{{ t('admin.pricing.warehouse.title') }}</h2>
          <p class="text-[12px] text-ink-500 mt-0.5">{{ t('admin.pricing.warehouse.desc') }}</p>
        </div>
        <div class="flex items-center gap-3 flex-wrap">
          <label for="almacen-etiquetado" class="flex items-center gap-2 text-[13px]">
            {{ t('product.price.labeling') }}
            <input
              id="almacen-etiquetado"
              type="number"
              step="0.01"
              class="input input-bordered input-sm w-24"
              [formField]="formulario.etiquetadoCny"
            />
            <span>CNY</span>
          </label>
          <label for="almacen-reempaquetado" class="flex items-center gap-2 text-[13px]">
            {{ t('product.price.repacking') }}
            <input
              id="almacen-reempaquetado"
              type="number"
              step="0.01"
              class="input input-bordered input-sm w-24"
              [formField]="formulario.reempaquetadoCny"
            />
            <span>CNY</span>
          </label>
          <button
            type="button"
            class="btn btn-primary btn-sm"
            data-testid="almacen-guardar"
            [attr.aria-label]="t('actions.save') + ': ' + t('admin.pricing.warehouse.title')"
            [disabled]="guardando() || !hayCambios() || formulario().invalid()"
            (click)="guarda()"
          >
            {{ t('actions.save') }}
          </button>
        </div>
      </div>
      @for (campo of [formulario.etiquetadoCny, formulario.reempaquetadoCny]; track $index) {
        @if (campo().touched() && campo().errors().length) {
          <p role="alert" class="text-[11px] text-error mt-1">{{ campo().errors()[0].message }}</p>
        }
      }
    }
  `,
})
export class PreciosServiciosDeAlmacen {
  private readonly consulta = inject(ConsultaLosServiciosDeAlmacen);
  private readonly guardaCasoDeUso = inject(GuardaLosServiciosDeAlmacen);
  private readonly avisos = inject(AvisosStore);
  protected readonly t = inject(TraduccionService).t;

  protected readonly servidor = signal<ServiciosDeAlmacen | null>(null);
  protected readonly guardando = signal(false);

  /** Se rehace cada vez que llega un valor nuevo del servidor: tras guardar el botón se apaga solo. */
  protected readonly modelo = linkedSignal<BorradorDeServicios>(() => ({
    etiquetadoCny: this.servidor()?.etiquetadoCny ?? 0,
    reempaquetadoCny: this.servidor()?.reempaquetadoCny ?? 0,
  }));

  protected readonly formulario = form(this.modelo, (ruta) => {
    required(ruta.etiquetadoCny, { message: () => this.t('dialog.field.required') });
    min(ruta.etiquetadoCny, 0, { message: () => this.t('dialog.field.min') });
    required(ruta.reempaquetadoCny, { message: () => this.t('dialog.field.required') });
    min(ruta.reempaquetadoCny, 0, { message: () => this.t('dialog.field.min') });
  });

  protected readonly hayCambios = computed(() => {
    const servidor = this.servidor();
    const borrador = this.modelo();
    return (
      !!servidor &&
      (servidor.etiquetadoCny !== borrador.etiquetadoCny ||
        servidor.reempaquetadoCny !== borrador.reempaquetadoCny)
    );
  });

  constructor() {
    void this.carga();
  }

  private async carga(): Promise<void> {
    // Si no se puede leer, la tarjeta no se pinta y las reglas siguen administrándose.
    const resultado = await this.consulta.ejecuta();
    if (resultado.ok) {
      this.servidor.set(resultado.valor);
    }
  }

  protected async guarda(): Promise<void> {
    const { etiquetadoCny, reempaquetadoCny } = this.modelo();
    if (etiquetadoCny === null || reempaquetadoCny === null || this.formulario().invalid()) {
      return;
    }
    this.guardando.set(true);
    try {
      const resultado = await this.guardaCasoDeUso.ejecuta({ etiquetadoCny, reempaquetadoCny });
      if (!resultado.ok) {
        this.avisos.error(resultado.error.mensaje || this.t('errors.generic'));
        return;
      }
      this.servidor.set(resultado.valor);
      this.avisos.exito(this.t('admin.pricing.warehouse.saved'));
    } finally {
      this.guardando.set(false);
    }
  }
}
