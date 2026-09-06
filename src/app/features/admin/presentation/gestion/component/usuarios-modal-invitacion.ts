import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { pareceCorreo } from '../../../domain/gestion/model/usuarios';
import { VentanaModal } from './ventana-modal';

/**
 * La invitación de una cuenta nueva.
 *
 * <p>Solo pide el correo: el papel se asigna después, desde la fila, con su confirmación. Invitar y
 * ascender son dos decisiones distintas y juntarlas en el mismo formulario hacía fácil crear un
 * administrador sin darse cuenta.
 *
 * <p>La comprobación del correo vive en el dominio (`pareceCorreo`) y aquí solo apaga el botón. No es la
 * regla —el backend valida de verdad—, es evitar el viaje inútil de mandar una invitación a «asdf».
 */
@Component({
  selector: 'nx-usuarios-modal-invitacion',
  imports: [FaIconComponent, VentanaModal],
  template: `
    <nx-ventana-modal [titulo]="t('admin.users.actions.invite')" (cierra)="cierra.emit()">
      <label class="block text-[12px] text-ink-500 mb-1" for="invitacion-email">
        {{ t('admin.users.col.email') }}
      </label>
      <input
        id="invitacion-email"
        type="email"
        class="input w-full"
        placeholder="alice@brand.com"
        [value]="correo()"
        (input)="escribe($event)"
      />
      <div class="flex justify-end gap-2 mt-4">
        <button type="button" class="btn btn-outline text-[12px]" (click)="cierra.emit()">
          {{ t('actions.cancel') }}
        </button>
        <button
          type="button"
          class="btn btn-primary text-[12px]"
          [disabled]="!valido() || enviando()"
          (click)="invita.emit(correo().trim())"
        >
          <fa-icon [icon]="iconoCorreo" /> {{ t('admin.users.actions.send_invite') }}
        </button>
      </div>
    </nx-ventana-modal>
  `,
})
export class UsuariosModalInvitacion {
  readonly enviando = input(false);

  readonly cierra = output<void>();
  readonly invita = output<string>();

  protected readonly iconoCorreo = faEnvelope;
  protected readonly t = inject(TraduccionService).t;

  protected readonly correo = signal('');
  protected readonly valido = computed(() => pareceCorreo(this.correo()));

  protected escribe(evento: Event): void {
    this.correo.set((evento.target as HTMLInputElement).value);
  }
}
