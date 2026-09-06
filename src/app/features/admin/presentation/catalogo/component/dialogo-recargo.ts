import { Component, computed, inject, input, output, signal } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PeticionDeRecargo } from '../../../domain/catalogo/port/productos-admin.port';
import { AmbitoElegido, SelectorDeAmbito } from './selector-de-ambito';
import { VentanaModal } from './ventana-modal';

/**
 * El recargo fijo por producto, en yuanes.
 *
 * <p>Es una de las palancas del precio: se suma al de venta tal cual, como el IVA o el envío. Cero lo
 * quita. Se puede aplicar a lo marcado, a la categoría del filtro o a todo el catálogo.
 */
@Component({
  selector: 'nx-dialogo-recargo',
  imports: [VentanaModal, SelectorDeAmbito],
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
        min="0"
        class="input w-full"
        placeholder="0"
        [value]="importe()"
        (input)="importe.set($any($event.target).value)"
      />
      <div class="mt-3">
        <nx-selector-de-ambito
          [(ambito)]="ambito"
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
          [disabled]="guardando() || !sePuedeGuardar()"
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
  protected readonly importe = signal('');
  protected readonly ambito = signal<AmbitoElegido>('todo');

  protected readonly sePuedeGuardar = computed(() => this.importe().trim() !== '');

  protected aplica(): void {
    this.confirma.emit({
      recargoCny: parseFloat(this.importe()),
      productoIds: this.ambito() === 'seleccion' ? this.seleccion() : undefined,
      categoriaId: this.ambito() === 'categoria' ? (this.categoriaId() ?? undefined) : undefined,
    });
  }
}
