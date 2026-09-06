import { Component, computed, inject, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPen, faStar, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { Direccion } from '../../domain/model/direccion';

/**
 * Una dirección guardada, con sus dos acciones.
 *
 * <p>No habla con el backend: avisa a quien la contiene, que es quien tiene el caso de uso. Así la
 * tarjeta se puede probar sola y reutilizar donde haga falta.
 */
@Component({
  selector: 'nx-tarjeta-de-direccion',
  imports: [FaIconComponent],
  template: `
    <div class="border border-ink-100 rounded-md p-3 text-sm relative">
      <div class="flex items-start justify-between gap-2">
        <div class="font-medium">{{ titulo() }}</div>
        @if (direccion().porDefecto) {
          <span class="badge bg-brand-50 text-brand-700">
            <fa-icon [icon]="iconos.defecto" class="mr-1" /> {{ t('checkout.default') }}
          </span>
        }
      </div>
      <div class="text-xs text-ink-600 mt-1">{{ direccion().nombreCompleto }}</div>
      @if (direccion().telefono) {
        <div class="text-xs text-ink-500">{{ direccion().telefono }}</div>
      }
      <div class="text-xs text-ink-500">{{ calle() }}</div>
      <div class="text-xs text-ink-500">{{ localidad() }}</div>
      <div class="text-xs text-ink-500">{{ direccion().pais }}</div>

      <div class="flex gap-3 mt-3 pt-3 border-t border-ink-100">
        <button type="button" class="text-xs text-brand-700 hover:underline" (click)="edita.emit(direccion())">
          <fa-icon [icon]="iconos.editar" /> {{ t('common.edit') }}
        </button>
        <button type="button" class="text-xs text-red-600 hover:underline" (click)="pideBorrar()">
          <fa-icon [icon]="iconos.borrar" /> {{ t('common.delete') }}
        </button>
      </div>
    </div>
  `,
})
export class TarjetaDeDireccion {
  readonly direccion = input.required<Direccion>();
  readonly edita = output<Direccion>();
  readonly borra = output<string>();

  private readonly traduccion = inject(TraduccionService);
  private readonly dialogo = inject(DialogoStore);

  protected readonly t = this.traduccion.t;
  protected readonly iconos = { defecto: faStar, editar: faPen, borrar: faTrashCan };

  protected readonly titulo = computed(
    () => this.direccion().etiqueta || this.direccion().nombreCompleto,
  );

  protected readonly calle = computed(() => {
    const direccion = this.direccion();
    return direccion.linea2 ? `${direccion.linea1}, ${direccion.linea2}` : direccion.linea1;
  });

  protected readonly localidad = computed(() => {
    const direccion = this.direccion();
    const ciudad = direccion.provincia ? `${direccion.ciudad}, ${direccion.provincia}` : direccion.ciudad;
    return direccion.codigoPostal ? `${ciudad} ${direccion.codigoPostal}` : ciudad;
  });

  /**
   * Borrar es destructivo y la tarjeta es pequeña: sin confirmación, un toque accidental se lleva la
   * dirección por delante. Los pedidos anteriores no se ven afectados —guardan su propia copia—, pero
   * rehacerla a mano es una molestia perfectamente evitable.
   */
  protected async pideBorrar(): Promise<void> {
    if (await this.dialogo.confirma(this.t('profile.confirm_delete'))) {
      this.borra.emit(this.direccion().id);
    }
  }
}
