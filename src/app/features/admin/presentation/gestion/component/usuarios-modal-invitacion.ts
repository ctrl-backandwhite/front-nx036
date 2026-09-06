import { Component, inject, input, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { FormField, form, required, validate } from '@angular/forms/signals';
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
 * <p>La comprobación del correo vive en el dominio (`pareceCorreo`) y aquí solo se DECLARA en el
 * esquema del formulario. No es la regla —el backend valida de verdad—, es evitar el viaje inútil de
 * mandar una invitación a «asdf». Al estar en el esquema, el mismo hecho apaga el botón y escribe el
 * aviso bajo el campo: antes eran dos sitios que podían decir cosas distintas.
 */
@Component({
  selector: 'nx-usuarios-modal-invitacion',
  imports: [FaIconComponent, VentanaModal, FormField],
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
        [formField]="formulario.correo"
      />
      <!-- El aviso solo aparece si ya se ha tocado el campo: abrir la ventana con el correo en rojo
           antes de escribir nada regaña sin motivo. -->
      @if (formulario.correo().touched() && formulario.correo().errors().length) {
        <p role="alert" class="text-[11px] text-error mt-1">
          {{ formulario.correo().errors()[0].message }}
        </p>
      }
      <div class="flex justify-end gap-2 mt-4">
        <button type="button" class="btn btn-outline text-[12px]" (click)="cierra.emit()">
          {{ t('actions.cancel') }}
        </button>
        <button
          type="button"
          class="btn btn-primary text-[12px]"
          [disabled]="formulario().invalid() || enviando()"
          (click)="invita.emit(modelo().correo.trim())"
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

  protected readonly modelo = signal({ correo: '' });
  protected readonly formulario = form(this.modelo, (ruta) => {
    required(ruta.correo, { message: () => this.t('dialog.field.required') });
    // La forma del correo solo se juzga cuando hay algo escrito: si no, el campo vacío daría dos
    // avisos a la vez —«obligatorio» y «no válido»— diciendo lo mismo.
    validate(ruta.correo, ({ value }) => {
      const escrito = value().trim();
      return escrito === '' || pareceCorreo(escrito)
        ? null
        : { kind: 'correo', message: this.t('login.error.bad_data') };
    });
  });
}
