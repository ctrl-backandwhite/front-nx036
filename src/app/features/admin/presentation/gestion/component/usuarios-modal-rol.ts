import { Component, computed, inject, input, output } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { OpcionDeFiltro } from '@ds/component/filtros/filtro-desplegable';
import { VentanaModal } from './ventana-modal';
import { CambioDeRol } from './usuarios-tabla';

/**
 * La confirmación de un cambio de papel.
 *
 * <p>Existe porque el papel se elige en un desplegable dentro de una tabla de veinticinco filas: sin
 * este paso, un clic desviado convierte a un cliente en administrador y nadie se entera. El texto dice
 * de QUIÉN, de QUÉ papel y a CUÁL, que es lo único que permite darse cuenta del error antes de aceptar.
 */
@Component({
  selector: 'nx-usuarios-modal-rol',
  imports: [VentanaModal],
  template: `
    <nx-ventana-modal [titulo]="t('admin.users.role_change_title')" (cierra)="cierra.emit()">
      <p class="text-sm text-ink-700">{{ mensaje() }}</p>
      <div class="flex justify-end gap-2 mt-4">
        <button type="button" class="btn btn-outline text-[12px]" (click)="cierra.emit()">
          {{ t('actions.cancel') }}
        </button>
        <button type="button" class="btn btn-primary text-[12px]" (click)="confirma.emit()">
          {{ t('actions.confirm') }}
        </button>
      </div>
    </nx-ventana-modal>
  `,
})
export class UsuariosModalRol {
  readonly cambio = input.required<CambioDeRol>();
  /** Las opciones ya traducidas que compone la página: aquí solo se busca la etiqueta de cada código. */
  readonly roles = input<readonly OpcionDeFiltro[]>([]);

  readonly cierra = output<void>();
  readonly confirma = output<void>();

  private readonly traduccion = inject(TraduccionService);
  protected readonly t = this.traduccion.t;

  protected readonly mensaje = computed(() => {
    const cambio = this.cambio();
    return this.traduccion.tCon('admin.users.role_change_body', {
      email: cambio.usuario.email,
      from: this.etiqueta(cambio.usuario.rol),
      to: this.etiqueta(cambio.rol),
    });
  });

  /** Si el papel no estuviera en la lista se enseña su código: es mejor que un hueco en la frase. */
  private etiqueta(rol: string): string {
    return this.roles().find((o) => o.valor === rol)?.etiqueta ?? rol;
  }
}
