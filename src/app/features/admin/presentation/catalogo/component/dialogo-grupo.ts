import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { FormField, form, required, validate } from '@angular/forms/signals';
import { TraduccionService } from '@core/i18n/traduccion.service';
import {
  BORRADOR_DE_GRUPO_VACIO,
  BorradorDeGrupo,
  grupoGuardable,
} from '../../../domain/catalogo/model/grupo-de-productos';
import { EstadoDeCampo, falloDelCampo } from '../etiquetas';
import { VentanaModal } from './ventana-modal';

/**
 * El alta y la edición de un grupo de productos.
 *
 * <p>Sin nombre no hay grupo: es lo que se elige después al escribir la regla de margen, y un grupo sin
 * nombre no se puede distinguir de otro en ese desplegable.
 */
@Component({
  selector: 'nx-dialogo-grupo',
  imports: [FormField, VentanaModal],
  template: `
    <nx-ventana-modal [titulo]="titulo()" (cierra)="cierra.emit()">
      <div class="space-y-3">
        <label class="block">
          <span class="text-[12px] font-medium text-ink-600 mb-1 block">
            {{ t('admin.groups.col.name') }} *
          </span>
          <input class="input input-bordered input-sm w-full" [formField]="formulario.nombre" />
          @if (fallo(formulario.nombre()); as texto) {
            <span class="text-[11px] text-error mt-0.5 block">{{ texto }}</span>
          }
        </label>
        <label class="block">
          <span class="text-[12px] font-medium text-ink-600 mb-1 block">
            {{ t('admin.groups.col.description') }}
          </span>
          <input class="input input-bordered input-sm w-full" [formField]="formulario.descripcion" />
        </label>
        <label class="flex items-center gap-2 text-[13px]">
          <input type="checkbox" class="checkbox checkbox-sm" [formField]="formulario.activo" />
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
          (click)="guarda.emit(modelo())"
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

  /** Lo que se está tecleando. Vuelve a lo que llega de fuera si la pantalla cambia de grupo. */
  protected readonly modelo = linkedSignal<BorradorDeGrupo, BorradorDeGrupo>({
    source: () => this.inicial(),
    computation: (inicial) => ({ ...inicial }),
  });

  /**
   * La única regla: sin nombre no hay grupo.
   *
   * <p>`required` marca el campo como obligatorio también para el navegador y los lectores de pantalla,
   * pero por sí solo dejaría pasar «   »: la comprobación de verdad es la del dominio, `grupoGuardable`,
   * que es la misma que decide si el botón se enciende.
   */
  protected readonly formulario = form(this.modelo, (ruta) => {
    required(ruta.nombre, { message: 'admin.groups.name_required' });
    validate(ruta.nombre, ({ value }) =>
      grupoGuardable({ ...BORRADOR_DE_GRUPO_VACIO, nombre: value() })
        ? undefined
        : { kind: 'required', message: 'admin.groups.name_required' },
    );
  });

  protected readonly sePuedeGuardar = computed(() => !this.formulario().invalid());

  protected readonly titulo = computed(() =>
    this.t(this.inicial().id ? 'actions.edit' : 'admin.groups.new'),
  );

  protected fallo(estado: EstadoDeCampo): string {
    return falloDelCampo(this.t, estado);
  }
}
