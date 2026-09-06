import { Component, inject, input, output, signal } from '@angular/core';
import { FormField, form, min, required } from '@angular/forms/signals';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PeticionDeRecargo } from '../../../domain/catalogo/port/productos-admin.port';
import { EstadoDeCampo, falloDelCampo } from '../etiquetas';
import { AmbitoElegido, SelectorDeAmbito } from './selector-de-ambito';
import { VentanaModal } from './ventana-modal';

/** Lo que se rellena en el diálogo. El importe nace vacío: `null` es «todavía no hay nada escrito». */
interface FormularioDeRecargo {
  importe: number | null;
  ambito: AmbitoElegido;
}

/**
 * El recargo fijo por producto, en yuanes.
 *
 * <p>Es una de las palancas del precio: se suma al de venta tal cual, como el IVA o el envío. Cero lo
 * quita. Se puede aplicar a lo marcado, a la categoría del filtro o a todo el catálogo.
 */
@Component({
  selector: 'nx-dialogo-recargo',
  imports: [FormField, VentanaModal, SelectorDeAmbito],
  template: `
    <nx-ventana-modal [titulo]="t('admin.catalog.surcharge.title')" (cierra)="cierra.emit()">
      <p class="text-[12px] text-ink-500 mb-2">{{ t('admin.catalog.surcharge.hint') }}</p>
      <label for="recargo-cny" class="text-xs text-ink-500">
        {{ t('admin.catalog.fields.surchargeCny') }}
      </label>
      <input
        id="recargo-cny"
        type="number"
        step="0.01"
        class="input w-full"
        placeholder="0"
        [formField]="formulario.importe"
      />
      @if (fallo(formulario.importe()); as texto) {
        <p class="text-[11px] text-error mt-0.5">{{ texto }}</p>
      }
      <div class="mt-3">
        <nx-selector-de-ambito
          [campo]="formulario.ambito"
          [seleccionados]="seleccion().length"
          [nombreDeCategoria]="nombreDeCategoria()"
          prefijo="admin.catalog.surcharge"
        />
      </div>
      <ng-container pie>
        <button type="button" class="btn btn-outline text-[12px]" (click)="cierra.emit()">
          {{ t('actions.cancel') }}
        </button>
        <button
          type="button"
          class="btn btn-primary text-[12px]"
          [disabled]="guardando() || formulario().invalid()"
          (click)="aplica()"
        >
          {{ guardando() ? t('common.loading') : t('actions.save') }}
        </button>
      </ng-container>
    </nx-ventana-modal>
  `,
})
export class DialogoRecargo {
  readonly seleccion = input<readonly string[]>([]);
  readonly categoriaId = input<string | null>(null);
  readonly nombreDeCategoria = input<string | null>(null);
  readonly guardando = input(false);

  readonly cierra = output<void>();
  readonly confirma = output<PeticionDeRecargo>();

  protected readonly t = inject(TraduccionService).t;

  protected readonly modelo = signal<FormularioDeRecargo>({ importe: null, ambito: 'todo' });

  /**
   * Las dos reglas del recargo, declaradas donde se pueden leer de una vez.
   *
   * <p>Sin importe no hay nada que aplicar, y un recargo NEGATIVO restaría del precio de venta: dejaría
   * el producto por debajo del coste sin que la pantalla dijera nada. El campo ya llevaba `min="0"` en
   * el marcado, pero eso solo lo respeta quien usa las flechas del navegador.
   */
  protected readonly formulario = form(this.modelo, (ruta) => {
    required(ruta.importe);
    min(ruta.importe, 0);
  });

  protected fallo(estado: EstadoDeCampo): string {
    return falloDelCampo(this.t, estado);
  }

  protected aplica(): void {
    const ambito = this.modelo().ambito;
    this.confirma.emit({
      recargoCny: this.modelo().importe ?? 0,
      productoIds: ambito === 'seleccion' ? this.seleccion() : undefined,
      categoriaId: ambito === 'categoria' ? (this.categoriaId() ?? undefined) : undefined,
    });
  }
}
