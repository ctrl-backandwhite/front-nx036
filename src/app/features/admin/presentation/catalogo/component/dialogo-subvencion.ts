import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormField, form, min, validateTree } from '@angular/forms/signals';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PeticionDeSubvencion } from '../../../domain/catalogo/port/productos-admin.port';
import { EstadoDeCampo, falloDelCampo } from '../etiquetas';
import { AmbitoElegido, SelectorDeAmbito } from './selector-de-ambito';
import { VentanaModal } from './ventana-modal';

/** Lo que se rellena en el diálogo. `null` en una bolsa significa «esa no la toco». */
interface FormularioDeSubvencion {
  envio: number | null;
  arancel: number | null;
  ambito: AmbitoElegido;
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
  imports: [FormField, VentanaModal, SelectorDeAmbito],
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
        class="input w-full"
        placeholder="0"
        [formField]="formulario.envio"
      />
      @if (fallo(formulario.envio()); as texto) {
        <p class="text-[11px] text-error mt-0.5">{{ texto }}</p>
      }
      <label for="subvencion-arancel" class="text-xs text-ink-500 mt-2 block">
        {{ t('admin.catalog.fields.dutyUserCny') }}
      </label>
      <input
        id="subvencion-arancel"
        type="number"
        step="0.01"
        class="input w-full"
        placeholder="0"
        [formField]="formulario.arancel"
      />
      @if (fallo(formulario.arancel()); as texto) {
        <p class="text-[11px] text-error mt-0.5">{{ texto }}</p>
      }
      <div class="mt-3">
        <nx-selector-de-ambito
          [campo]="formulario.ambito"
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

  protected readonly modelo = signal<FormularioDeSubvencion>({
    envio: null,
    arancel: null,
    ambito: 'todo',
  });

  /**
   * Las reglas de las dos bolsas.
   *
   * <p>Ninguna es obligatoria por separado —dejar una vacía es justo cómo se cambia una sin pisar la
   * otra—, pero las dos vacías no aplican nada: eso se comprueba SOBRE EL FORMULARIO ENTERO con
   * `validateTree`, que es donde vive una regla que mira dos campos a la vez.
   *
   * <p>Y ninguna puede ser negativa: una bolsa en negativo le sumaría al cliente en vez de descontarle.
   */
  protected readonly formulario = form(this.modelo, (ruta) => {
    min(ruta.envio, 0);
    min(ruta.arancel, 0);
    validateTree(ruta, ({ value }) =>
      value().envio === null && value().arancel === null
        ? { kind: 'sin-bolsas', message: 'admin.catalog.subsidy.hint' }
        : undefined,
    );
  });

  /** Vale para guardar cuando no queda ningún error: el de las dos bolsas vacías incluido. */
  protected readonly sePuedeGuardar = computed(() => !this.formulario().invalid());

  protected fallo(estado: EstadoDeCampo): string {
    return falloDelCampo(this.t, estado);
  }

  protected aplica(): void {
    const valores = this.modelo();
    this.confirma.emit({
      envioCny: valores.envio ?? undefined,
      arancelCny: valores.arancel ?? undefined,
      productoIds: valores.ambito === 'seleccion' ? this.seleccion() : undefined,
      categoriaId: valores.ambito === 'categoria' ? (this.categoriaId() ?? undefined) : undefined,
    });
  }
}
