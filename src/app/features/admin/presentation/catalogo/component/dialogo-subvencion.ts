import { Component, computed, inject, input, output, signal } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PeticionDeSubvencion } from '../../../domain/catalogo/port/productos-admin.port';
import { AmbitoElegido, SelectorDeAmbito } from './selector-de-ambito';
import { VentanaModal } from './ventana-modal';

/** Un importe vacío significa «no lo toco»; uno escrito, el valor que se fija. */
function importeOSinTocar(texto: string): number | undefined {
  return texto === '' ? undefined : parseFloat(texto);
}

/**
 * Las dos bolsas de subvención por producto, en yuanes.
 *
 * <p>Son BOLSAS ESTANCAS: la primera se descuenta del envío del pedido y la segunda del arancel, y lo
 * que sobre de una no cubre la otra. Por eso hay dos campos y no uno, y por eso el que se deja vacío no
 * se manda: así se cambia el envío sin pisar el arancel.
 */
@Component({
  selector: 'nx-dialogo-subvencion',
  imports: [VentanaModal, SelectorDeAmbito],
  template: `
    <nx-ventana-modal [titulo]="t('admin.catalog.subsidy.title')" (cierra)="cierra.emit()">
      <p class="text-[12px] text-ink-500 mb-2">{{ t('admin.catalog.subsidy.hint') }}</p>
      <label for="subvencion-envio" class="text-xs text-ink-500">
        {{ t('admin.catalog.fields.shippingUserCny') }}
      </label>
      <input
        id="subvencion-envio"
        type="number"
        step="0.01"
        min="0"
        class="input w-full"
        placeholder="0"
        [value]="envio()"
        (input)="envio.set($any($event.target).value)"
      />
      <label for="subvencion-arancel" class="text-xs text-ink-500 mt-2 block">
        {{ t('admin.catalog.fields.dutyUserCny') }}
      </label>
      <input
        id="subvencion-arancel"
        type="number"
        step="0.01"
        min="0"
        class="input w-full"
        placeholder="0"
        [value]="arancel()"
        (input)="arancel.set($any($event.target).value)"
      />
      <div class="mt-3">
        <nx-selector-de-ambito
          [(ambito)]="ambito"
          [seleccionados]="seleccion().length"
          [nombreDeCategoria]="nombreDeCategoria()"
          prefijo="admin.catalog.subsidy"
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
export class DialogoSubvencion {
  readonly seleccion = input<readonly string[]>([]);
  readonly categoriaId = input<string | null>(null);
  readonly nombreDeCategoria = input<string | null>(null);
  readonly guardando = input(false);

  readonly cierra = output<void>();
  readonly confirma = output<PeticionDeSubvencion>();

  protected readonly t = inject(TraduccionService).t;
  protected readonly envio = signal('');
  protected readonly arancel = signal('');
  protected readonly ambito = signal<AmbitoElegido>('todo');

  protected readonly sePuedeGuardar = computed(() => this.envio() !== '' || this.arancel() !== '');

  protected aplica(): void {
    this.confirma.emit({
      envioCny: importeOSinTocar(this.envio()),
      arancelCny: importeOSinTocar(this.arancel()),
      productoIds: this.ambito() === 'seleccion' ? this.seleccion() : undefined,
      categoriaId: this.ambito() === 'categoria' ? (this.categoriaId() ?? undefined) : undefined,
    });
  }
}
