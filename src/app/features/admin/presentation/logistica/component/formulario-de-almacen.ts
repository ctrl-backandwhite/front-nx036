import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FormField, apply, form } from '@angular/forms/signals';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { DatosDeAlmacen } from '../../../domain/logistica/model/almacen';
import { TEXTO_CON_CONTENIDO, claveDeError } from '../form/reglas-de-formulario';

/**
 * Lo que se teclea, con país y ciudad SIEMPRE como texto.
 *
 * <p>En el modelo del dominio los dos son opcionales, y un `undefined` atado a un campo se pinta
 * literalmente como «undefined». Aquí se normalizan a cadena vacía y se devuelven tal cual: el
 * dominio los admite igual.
 */
interface BorradorDeAlmacen {
  codigo: string;
  nombre: string;
  pais: string;
  ciudad: string;
  activo: boolean;
}

/**
 * Alta y edición de un almacén.
 *
 * <p>Se edita sobre una COPIA: la fila de la tabla no se toca hasta que el guardado sale bien, para que
 * cancelar a medias no deje la lista contando algo que no está guardado.
 */
@Component({
  selector: 'nx-formulario-de-almacen',
  imports: [FaIconComponent, FormField],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="titulo()"
    >
      <!-- El fondo cierra al pulsarlo, como hermano del panel: anidarlo obligaría a frenar la
           propagación de cada clic de dentro, y un olvido cierra el formulario a medio rellenar. -->
      <div class="absolute inset-0 bg-black/40" (click)="cancela.emit()" aria-hidden="true"></div>
      <div
        class="relative bg-base-100 rounded-box shadow-xl w-full max-w-md p-5 border border-base-200"
      >
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-semibold text-lg">{{ titulo() }}</h2>
          <button
            type="button"
            (click)="cancela.emit()"
            class="btn btn-ghost btn-sm btn-square"
            [attr.aria-label]="t('common.close')"
          >
            <fa-icon [icon]="iconoAspa" />
          </button>
        </div>

        <div class="space-y-3">
          <div>
            <label for="almacen-codigo" class="text-[12px] text-ink-500 mb-1 block">
              {{ t('admin.warehouses.field.code') }} *
            </label>
            <input
              id="almacen-codigo"
              class="input input-bordered input-sm w-full"
              placeholder="ES-MAD"
              [formField]="formulario.codigo"
            />
            @if (formulario.codigo().touched() && errorDe(formulario.codigo().errors()); as clave) {
              <p class="text-[11px] text-error mt-1" role="alert">{{ t(clave) }}</p>
            }
          </div>
          <div>
            <label for="almacen-nombre" class="text-[12px] text-ink-500 mb-1 block">
              {{ t('admin.warehouses.field.name') }} *
            </label>
            <input
              id="almacen-nombre"
              class="input input-bordered input-sm w-full"
              placeholder="Madrid Central"
              [formField]="formulario.nombre"
            />
            @if (formulario.nombre().touched() && errorDe(formulario.nombre().errors()); as clave) {
              <p class="text-[11px] text-error mt-1" role="alert">{{ t(clave) }}</p>
            }
          </div>
          <!-- Móvil primero: una columna, y dos a partir de la anchura pequeña. -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label for="almacen-pais" class="text-[12px] text-ink-500 mb-1 block">
                {{ t('admin.warehouses.field.country') }}
              </label>
              <input
                id="almacen-pais"
                class="input input-bordered input-sm w-full"
                placeholder="ES"
                [formField]="formulario.pais"
              />
              @if (formulario.pais().touched() && errorDe(formulario.pais().errors()); as clave) {
                <p class="text-[11px] text-error mt-1" role="alert">{{ t(clave) }}</p>
              }
            </div>
            <div>
              <label for="almacen-ciudad" class="text-[12px] text-ink-500 mb-1 block">
                {{ t('admin.warehouses.field.city') }}
              </label>
              <input
                id="almacen-ciudad"
                class="input input-bordered input-sm w-full"
                placeholder="Madrid"
                [formField]="formulario.ciudad"
              />
            </div>
          </div>
          <label class="flex items-center gap-2 text-[13px]">
            <input type="checkbox" class="checkbox checkbox-sm" [formField]="formulario.activo" />
            {{ t('admin.warehouses.active') }}
          </label>
        </div>

        <div class="flex justify-end gap-2 mt-4">
          <button type="button" (click)="cancela.emit()" class="btn btn-ghost btn-sm">
            {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            (click)="guarda.emit(modelo())"
            [disabled]="guardando() || formulario().invalid()"
            class="btn btn-primary btn-sm"
          >
            {{ t('admin.warehouses.save') }}
          </button>
        </div>
      </div>
    </div>
  `,
  host: { '(document:keydown.escape)': 'cancela.emit()' },
})
export class FormularioDeAlmacen {
  readonly datos = input.required<DatosDeAlmacen>();
  readonly editando = input(false);
  readonly guardando = input(false);

  readonly cancela = output<void>();
  readonly guarda = output<DatosDeAlmacen>();

  protected readonly iconoAspa = faXmark;
  protected readonly t = inject(TraduccionService).t;

  protected readonly errorDe = claveDeError;

  /** Se edita sobre una COPIA: la fila de la tabla no se toca hasta que el guardado sale bien. */
  protected readonly modelo = linkedSignal<BorradorDeAlmacen>(() => {
    const datos = this.datos();
    return {
      codigo: datos.codigo,
      nombre: datos.nombre,
      pais: datos.pais ?? '',
      ciudad: datos.ciudad ?? '',
      activo: datos.activo,
    };
  });

  /**
   * Las reglas van DECLARADAS: sin código ni nombre el albarán no identifica el almacén y el backend
   * lo rechaza. Antes lo decía `almacenGuardable` desde la plantilla; ahora lo dice el esquema, y el
   * botón de guardar se apaga solo — el caso de uso sigue comprobándolo, que es quien de verdad manda.
   */
  protected readonly formulario = form(this.modelo, (ruta) => {
    apply(ruta.codigo, TEXTO_CON_CONTENIDO);
    apply(ruta.nombre, TEXTO_CON_CONTENIDO);
  });

  protected readonly titulo = computed(() =>
    this.editando() ? this.t('admin.warehouses.edit') : this.t('admin.warehouses.create'),
  );
}
