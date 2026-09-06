import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { DatosDeAlmacen, almacenGuardable } from '../../../domain/logistica/model/almacen';

/**
 * Alta y edición de un almacén.
 *
 * <p>Se edita sobre una COPIA: la fila de la tabla no se toca hasta que el guardado sale bien, para que
 * cancelar a medias no deje la lista contando algo que no está guardado.
 */
@Component({
  selector: 'nx-formulario-de-almacen',
  imports: [FaIconComponent],
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
              [value]="borrador().codigo"
              (input)="cambia('codigo', $any($event.target).value)"
            />
          </div>
          <div>
            <label for="almacen-nombre" class="text-[12px] text-ink-500 mb-1 block">
              {{ t('admin.warehouses.field.name') }} *
            </label>
            <input
              id="almacen-nombre"
              class="input input-bordered input-sm w-full"
              placeholder="Madrid Central"
              [value]="borrador().nombre"
              (input)="cambia('nombre', $any($event.target).value)"
            />
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
                [value]="borrador().pais ?? ''"
                (input)="cambia('pais', $any($event.target).value)"
              />
            </div>
            <div>
              <label for="almacen-ciudad" class="text-[12px] text-ink-500 mb-1 block">
                {{ t('admin.warehouses.field.city') }}
              </label>
              <input
                id="almacen-ciudad"
                class="input input-bordered input-sm w-full"
                placeholder="Madrid"
                [value]="borrador().ciudad ?? ''"
                (input)="cambia('ciudad', $any($event.target).value)"
              />
            </div>
          </div>
          <label class="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              class="checkbox checkbox-sm"
              [checked]="borrador().activo"
              (change)="marcaActivo($any($event.target).checked)"
            />
            {{ t('admin.warehouses.active') }}
          </label>
        </div>

        <div class="flex justify-end gap-2 mt-4">
          <button type="button" (click)="cancela.emit()" class="btn btn-ghost btn-sm">
            {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            (click)="guarda.emit(borrador())"
            [disabled]="guardando() || !completo()"
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

  protected readonly borrador = linkedSignal(() => this.datos());
  protected readonly completo = computed(() => almacenGuardable(this.borrador()));
  protected readonly titulo = computed(() =>
    this.editando() ? this.t('admin.warehouses.edit') : this.t('admin.warehouses.create'),
  );

  protected cambia(clave: 'codigo' | 'nombre' | 'pais' | 'ciudad', valor: string): void {
    this.borrador.update((actual) => ({ ...actual, [clave]: valor }));
  }

  protected marcaActivo(activo: boolean): void {
    this.borrador.update((actual) => ({ ...actual, activo }));
  }
}
