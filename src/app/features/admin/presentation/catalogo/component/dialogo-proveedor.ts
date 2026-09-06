import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { FormField, form, max, min, required, validate } from '@angular/forms/signals';
import { TraduccionService } from '@core/i18n/traduccion.service';
import {
  BORRADOR_DE_PROVEEDOR_VACIO,
  BorradorDeProveedor,
  proveedorGuardable,
} from '../../../domain/catalogo/model/proveedor-admin';
import { EstadoDeCampo, conRespaldo, falloDelCampo } from '../etiquetas';
import { VentanaModal } from './ventana-modal';

/**
 * Lo que se teclea en el diálogo.
 *
 * <p>Es el borrador del dominio con los DOS números como números y no como texto: así el mínimo y el
 * máximo de la valoración se declaran en el esquema en vez de quedarse en unos atributos `min`/`max`
 * que solo respetaban las flechas del navegador. El borrador del dominio sigue siendo todo texto —lo
 * usan el caso de uso y sus pruebas—, y la conversión se hace en los dos bordes de esta pantalla.
 */
interface FormularioDeProveedor {
  nombre: string;
  nombreZh: string;
  pais: string;
  ciudad: string;
  valoracion: number | null;
  anosActivo: number | null;
  verificado: boolean;
  trustPass: boolean;
  urlPerfil: string;
}

/** Un número que puede faltar, escrito como lo espera el borrador del dominio: el hueco es «». */
function comoTexto(valor: number | null): string {
  return valor === null ? '' : String(valor);
}

/** Y al revés: el texto vacío del borrador es «no hay número». */
function comoNumero(texto: string): number | null {
  return texto === '' ? null : Number(texto);
}

/**
 * El alta y la edición de un proveedor.
 *
 * <p>Casi todos llegan del volcado de 1688 y se corrigen aquí. El nombre es lo único obligatorio: es lo
 * que identifica al proveedor en la tabla y en la ficha del producto.
 */
@Component({
  selector: 'nx-dialogo-proveedor',
  imports: [FormField, VentanaModal],
  template: `
    <nx-ventana-modal [titulo]="titulo()" ancho="sm:max-w-lg" (cierra)="cierra.emit()">
      <div class="space-y-3">
        <label class="block">
          <span class="text-[12px] text-ink-500 mb-1 block">
            {{ t('admin.suppliers.col.name') }} *
          </span>
          <input class="input input-bordered input-sm w-full" [formField]="formulario.nombre" />
          @if (fallo(formulario.nombre()); as texto) {
            <span class="text-[11px] text-error mt-0.5 block">{{ texto }}</span>
          }
        </label>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label class="block">
            <span class="text-[12px] text-ink-500 mb-1 block">{{ t('admin.categories.col.zh') }}</span>
            <input class="input input-bordered input-sm w-full" [formField]="formulario.nombreZh" />
          </label>
          <label class="block">
            <span class="text-[12px] text-ink-500 mb-1 block">
              {{ t('admin.suppliers.col.country') }}
            </span>
            <input
              class="input input-bordered input-sm w-full"
              placeholder="CN"
              [formField]="formulario.pais"
            />
          </label>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label class="block">
            <span class="text-[12px] text-ink-500 mb-1 block">{{ t('admin.suppliers.col.city') }}</span>
            <input class="input input-bordered input-sm w-full" [formField]="formulario.ciudad" />
          </label>
          <label class="block">
            <span class="text-[12px] text-ink-500 mb-1 block">{{ t('admin.suppliers.col.rating') }}</span>
            <input
              type="number"
              step="0.1"
              class="input input-bordered input-sm w-full"
              [formField]="formulario.valoracion"
            />
            @if (fallo(formulario.valoracion()); as texto) {
              <span class="text-[11px] text-error mt-0.5 block">{{ texto }}</span>
            }
          </label>
          <label class="block">
            <span class="text-[12px] text-ink-500 mb-1 block">{{ t('admin.suppliers.col.years') }}</span>
            <input
              type="number"
              class="input input-bordered input-sm w-full"
              [formField]="formulario.anosActivo"
            />
            @if (fallo(formulario.anosActivo()); as texto) {
              <span class="text-[11px] text-error mt-0.5 block">{{ texto }}</span>
            }
          </label>
        </div>
        <label class="block">
          <!-- Sin clave propia en el diccionario todavía: se enseña el respaldo hasta que la haya. -->
          <span class="text-[12px] text-ink-500 mb-1 block">{{ etiquetaDelPerfil() }}</span>
          <input class="input input-bordered input-sm w-full" [formField]="formulario.urlPerfil" />
        </label>
        <div class="flex gap-4 flex-wrap">
          <label class="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              class="checkbox checkbox-sm"
              [formField]="formulario.verificado"
            />
            {{ t('admin.suppliers.col.verified') }}
          </label>
          <label class="flex items-center gap-2 text-[13px]">
            <input type="checkbox" class="checkbox checkbox-sm" [formField]="formulario.trustPass" />
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

  /** Lo que se está tecleando. Vuelve a lo que llega de fuera si la pantalla cambia de proveedor. */
  protected readonly modelo = linkedSignal<BorradorDeProveedor, FormularioDeProveedor>({
    source: () => this.inicial(),
    computation: (inicial) => ({
      ...inicial,
      valoracion: comoNumero(inicial.valoracion),
      anosActivo: comoNumero(inicial.anosActivo),
    }),
  });

  /**
   * Las reglas del proveedor.
   *
   * <p>El nombre es lo único obligatorio y la regla la pone el dominio (`proveedorGuardable`): un nombre
   * de solo espacios no identifica a nadie, y `required` por sí solo lo dejaría pasar.
   *
   * <p>La valoración va de 0 a 5 y los años activo no pueden ser negativos. Antes eso vivía en unos
   * atributos `min`/`max` del marcado, que solo limitan las flechas del navegador: tecleando un 9 se
   * guardaba un 9. Ahora es una regla del formulario y además el navegador sigue viendo los mismos
   * límites, porque los escribe la propia directiva.
   */
  protected readonly formulario = form(this.modelo, (ruta) => {
    required(ruta.nombre);
    validate(ruta.nombre, ({ value }) =>
      value().trim() === '' ? { kind: 'required' } : undefined,
    );
    min(ruta.valoracion, 0);
    max(ruta.valoracion, 5);
    min(ruta.anosActivo, 0);
  });

  protected readonly sePuedeGuardar = computed(
    () => !this.formulario().invalid() && proveedorGuardable(this.borrador()),
  );

  /** Lo que se publica hacia fuera: el borrador del dominio, con los números otra vez como texto. */
  protected readonly borrador = computed<BorradorDeProveedor>(() => ({
    ...this.modelo(),
    valoracion: comoTexto(this.modelo().valoracion),
    anosActivo: comoTexto(this.modelo().anosActivo),
  }));

  protected readonly etiquetaDelPerfil = computed(() =>
    conRespaldo(this.t, 'admin.suppliers.col.profile', 'URL del perfil'),
  );

  protected readonly titulo = computed(() =>
    this.t(this.editando() ? 'admin.suppliers.actions.edit' : 'admin.suppliers.actions.create'),
  );

  protected fallo(estado: EstadoDeCampo): string {
    return falloDelCampo(this.t, estado);
  }
}
