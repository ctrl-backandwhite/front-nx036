import { Component, computed, inject, input, output, signal } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import {
  BORRADOR_DE_PROVEEDOR_VACIO,
  BorradorDeProveedor,
  proveedorGuardable,
} from '../../../domain/catalogo/model/proveedor-admin';
import { conRespaldo } from '../etiquetas';
import { VentanaModal } from './ventana-modal';

/**
 * El alta y la edición de un proveedor.
 *
 * <p>Casi todos llegan del volcado de 1688 y se corrigen aquí. El nombre es lo único obligatorio: es lo
 * que identifica al proveedor en la tabla y en la ficha del producto.
 */
@Component({
  selector: 'nx-dialogo-proveedor',
  imports: [VentanaModal],
  template: `
    <nx-ventana-modal [titulo]="titulo()" ancho="sm:max-w-lg" (cierra)="cierra.emit()">
      <div class="space-y-3">
        <label class="block">
          <span class="text-[12px] text-ink-500 mb-1 block">
            {{ t('admin.suppliers.col.name') }} *
          </span>
          <input
            class="input input-bordered input-sm w-full"
            [value]="borrador().nombre"
            (input)="fija('nombre', $any($event.target).value)"
          />
        </label>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label class="block">
            <span class="text-[12px] text-ink-500 mb-1 block">{{ t('admin.categories.col.zh') }}</span>
            <input
              class="input input-bordered input-sm w-full"
              [value]="borrador().nombreZh"
              (input)="fija('nombreZh', $any($event.target).value)"
            />
          </label>
          <label class="block">
            <span class="text-[12px] text-ink-500 mb-1 block">
              {{ t('admin.suppliers.col.country') }}
            </span>
            <input
              class="input input-bordered input-sm w-full"
              placeholder="CN"
              [value]="borrador().pais"
              (input)="fija('pais', $any($event.target).value)"
            />
          </label>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label class="block">
            <span class="text-[12px] text-ink-500 mb-1 block">{{ t('admin.suppliers.col.city') }}</span>
            <input
              class="input input-bordered input-sm w-full"
              [value]="borrador().ciudad"
              (input)="fija('ciudad', $any($event.target).value)"
            />
          </label>
          <label class="block">
            <span class="text-[12px] text-ink-500 mb-1 block">{{ t('admin.suppliers.col.rating') }}</span>
            <input
              type="number"
              step="0.1"
              min="0"
              max="5"
              class="input input-bordered input-sm w-full"
              [value]="borrador().valoracion"
              (input)="fija('valoracion', $any($event.target).value)"
            />
          </label>
          <label class="block">
            <span class="text-[12px] text-ink-500 mb-1 block">{{ t('admin.suppliers.col.years') }}</span>
            <input
              type="number"
              class="input input-bordered input-sm w-full"
              [value]="borrador().anosActivo"
              (input)="fija('anosActivo', $any($event.target).value)"
            />
          </label>
        </div>
        <label class="block">
          <!-- Sin clave propia en el diccionario todavía: se enseña el respaldo hasta que la haya. -->
          <span class="text-[12px] text-ink-500 mb-1 block">{{ etiquetaDelPerfil() }}</span>
          <input
            class="input input-bordered input-sm w-full"
            [value]="borrador().urlPerfil"
            (input)="fija('urlPerfil', $any($event.target).value)"
          />
        </label>
        <div class="flex gap-4 flex-wrap">
          <label class="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              class="checkbox checkbox-sm"
              [checked]="borrador().verificado"
              (change)="marca('verificado', $event)"
            />
            {{ t('admin.suppliers.col.verified') }}
          </label>
          <label class="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              class="checkbox checkbox-sm"
              [checked]="borrador().trustPass"
              (change)="marca('trustPass', $event)"
            />
            TrustPass
          </label>
        </div>
      </div>

      <ng-container pie>
        <button type="button" class="btn btn-ghost btn-sm" (click)="cierra.emit()">
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          class="btn btn-primary btn-sm"
          [disabled]="guardando() || !sePuedeGuardar()"
          (click)="guarda.emit(borrador())"
        >
          {{ t('admin.suppliers.save') }}
        </button>
      </ng-container>
    </nx-ventana-modal>
  `,
})
export class DialogoProveedor {
  readonly inicial = input<BorradorDeProveedor>(BORRADOR_DE_PROVEEDOR_VACIO);
  readonly editando = input(false);
  readonly guardando = input(false);

  readonly cierra = output<void>();
  readonly guarda = output<BorradorDeProveedor>();

  protected readonly t = inject(TraduccionService).t;
  private readonly cambios = signal<Partial<BorradorDeProveedor>>({});

  protected readonly borrador = computed<BorradorDeProveedor>(() => ({
    ...this.inicial(),
    ...this.cambios(),
  }));

  protected readonly sePuedeGuardar = computed(() => proveedorGuardable(this.borrador()));

  protected etiquetaDelPerfil(): string {
    return conRespaldo(this.t, 'admin.suppliers.col.profile', 'URL del perfil');
  }

  protected titulo(): string {
    return this.t(this.editando() ? 'admin.suppliers.actions.edit' : 'admin.suppliers.actions.create');
  }

  protected fija(clave: keyof BorradorDeProveedor, valor: string): void {
    this.cambios.update((actual) => ({ ...actual, [clave]: valor }));
  }

  protected marca(clave: 'verificado' | 'trustPass', evento: Event): void {
    const valor = (evento.target as HTMLInputElement).checked;
    this.cambios.update((actual) => ({ ...actual, [clave]: valor }));
  }
}
