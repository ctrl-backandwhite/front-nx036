import { Component, computed, inject, input, output, signal } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import {
  BORRADOR_DE_GRUPO_VACIO,
  BorradorDeGrupo,
  grupoGuardable,
} from '../../../domain/catalogo/model/grupo-de-productos';
import { VentanaModal } from './ventana-modal';

/**
 * El alta y la edición de un grupo de productos.
 *
 * <p>Sin nombre no hay grupo: es lo que se elige después al escribir la regla de margen, y un grupo sin
 * nombre no se puede distinguir de otro en ese desplegable.
 */
@Component({
  selector: 'nx-dialogo-grupo',
  imports: [VentanaModal],
  template: `
    <nx-ventana-modal [titulo]="titulo()" (cierra)="cierra.emit()">
      <div class="space-y-3">
        <label class="block">
          <span class="text-[12px] font-medium text-ink-600 mb-1 block">
            {{ t('admin.groups.col.name') }} *
          </span>
          <input
            class="input input-bordered input-sm w-full"
            [value]="borrador().nombre"
            (input)="fija('nombre', $any($event.target).value)"
          />
        </label>
        <label class="block">
          <span class="text-[12px] font-medium text-ink-600 mb-1 block">
            {{ t('admin.groups.col.description') }}
          </span>
          <input
            class="input input-bordered input-sm w-full"
            [value]="borrador().descripcion"
            (input)="fija('descripcion', $any($event.target).value)"
          />
        </label>
        <label class="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            class="checkbox checkbox-sm"
            [checked]="borrador().activo"
            (change)="marcaActivo($event)"
          />
          {{ t('admin.groups.col.active') }}
        </label>
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
          {{ t('actions.save') }}
        </button>
      </ng-container>
    </nx-ventana-modal>
  `,
})
export class DialogoGrupo {
  readonly inicial = input<BorradorDeGrupo>(BORRADOR_DE_GRUPO_VACIO);
  readonly guardando = input(false);

  readonly cierra = output<void>();
  readonly guarda = output<BorradorDeGrupo>();

  protected readonly t = inject(TraduccionService).t;
  private readonly cambios = signal<Partial<BorradorDeGrupo>>({});

  protected readonly borrador = computed<BorradorDeGrupo>(() => ({
    ...this.inicial(),
    ...this.cambios(),
  }));

  protected readonly sePuedeGuardar = computed(() => grupoGuardable(this.borrador()));

  protected titulo(): string {
    return this.t(this.inicial().id ? 'actions.edit' : 'admin.groups.new');
  }

  protected fija(clave: 'nombre' | 'descripcion', valor: string): void {
    this.cambios.update((actual) => ({ ...actual, [clave]: valor }));
  }

  protected marcaActivo(evento: Event): void {
    const activo = (evento.target as HTMLInputElement).checked;
    this.cambios.update((actual) => ({ ...actual, activo }));
  }
}
