import { Component, inject, input, linkedSignal, output } from '@angular/core';
import { FormField, form, maxLength, pattern } from '@angular/forms/signals';
import { TraduccionService } from '@core/i18n/traduccion.service';
import {
  CambiosDeUsuario,
  UsuarioGestionado,
} from '../../../domain/gestion/model/usuarios';
import { nombreDeIdioma } from '../../../domain/gestion/model/perfil';
import { VentanaModal } from './ventana-modal';

/**
 * Los idiomas que se pueden asignar a una cuenta desde el panel.
 *
 * <p>Son los cuatro que ofrecía el panel anterior. Sus nombres NO pasan por el diccionario: el nombre de
 * un idioma se escribe en ese mismo idioma —«Deutsch», no «Alemán»— para que quien lo busca lo reconozca
 * aunque la interfaz esté en otro. Salen del dominio, que ya los tenía.
 */
const IDIOMAS: readonly string[] = ['es', 'en', 'pt', 'zh'];

/** El país de registro son DOS letras, como ISO-3166 alfa-2; vacío significa «sin país». */
const PAIS_ISO = /^[A-Za-z]{2}$/;

/**
 * La ficha de edición de una cuenta.
 *
 * <p>Guarda lo que se ve: nombre, empresa, país e idioma, más el interruptor de activa. El PAPEL no está
 * aquí a propósito —se cambia desde la fila, con su confirmación— y el correo tampoco: cambiarlo es
 * cambiar la identidad con la que alguien entra, y eso no es una edición de ficha.
 *
 * <p>El PAÍS es el de REGISTRO. Es el que decide el margen del comprador, así que tocarlo aquí cambia lo
 * que se le cobra; por eso el esquema exige exactamente dos letras cuando hay algo escrito y el botón se
 * apaga si no las tiene. Antes solo había un `maxlength` en la plantilla: una sola letra pasaba, el
 * backend la rechazaba y el motivo llegaba como «País desconocido» después del viaje.
 *
 * <p>Los identificadores de los campos son fijos y no generados: solo hay una ficha abierta a la vez, y
 * lo importante es que cada `<label>` apunte a SU campo —sin `for`, un lector de pantalla no sabe decir
 * cuál es cuál y pulsar la etiqueta no enfoca nada.
 *
 * <p>MOBILE FIRST: los campos van en una columna y pasan a dos desde `sm`.
 */
@Component({
  selector: 'nx-usuarios-modal-edicion',
  imports: [VentanaModal, FormField],
  template: `
    <nx-ventana-modal
      [titulo]="t('admin.users.actions.edit') + ' · ' + usuario().email"
      (cierra)="cierra.emit()"
    >
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <label class="block" for="usuario-nombre">
          <span class="text-[12px] text-ink-500">{{ t('admin.users.col.name') }}</span>
          <input id="usuario-nombre" class="input w-full mt-1" [formField]="formulario.nombre" />
        </label>
        <label class="block" for="usuario-empresa">
          <span class="text-[12px] text-ink-500">{{ t('admin.users.col.company') }}</span>
          <input id="usuario-empresa" class="input w-full mt-1" [formField]="formulario.empresa" />
        </label>
        <label class="block" for="usuario-pais">
          <span class="text-[12px] text-ink-500">{{ t('admin.users.col.country') }}</span>
          <input id="usuario-pais" class="input w-full mt-1" [formField]="formulario.pais" />
          @if (formulario.pais().touched() && formulario.pais().errors().length) {
            <span role="alert" class="text-[11px] text-error mt-0.5 block">
              {{ formulario.pais().errors()[0].message }}
            </span>
          }
        </label>
        <label class="block" for="usuario-idioma">
          <span class="text-[12px] text-ink-500">{{ t('admin.users.col.language') }}</span>
          <select id="usuario-idioma" class="input w-full mt-1" [formField]="formulario.idioma">
            @for (codigo of idiomas; track codigo) {
              <option [value]="codigo">{{ nombreDelIdioma(codigo) }}</option>
            }
          </select>
        </label>
        <label class="sm:col-span-2 flex items-center gap-2 text-[12px]" for="usuario-activo">
          <input id="usuario-activo" type="checkbox" [formField]="formulario.activo" />
          {{ t('admin.users.col.active') }}
        </label>
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <button type="button" class="btn btn-outline text-[12px]" (click)="cierra.emit()">
          {{ t('actions.cancel') }}
        </button>
        <button
          type="button"
          class="btn btn-primary text-[12px]"
          [disabled]="guardando() || formulario().invalid()"
          (click)="envia()"
        >
          {{ guardando() ? t('common.saving') : t('actions.save') }}
        </button>
      </div>
    </nx-ventana-modal>
  `,
})
export class UsuariosModalEdicion {
  readonly usuario = input.required<UsuarioGestionado>();
  readonly guardando = input(false);

  readonly cierra = output<void>();
  readonly guarda = output<CambiosDeUsuario>();

  protected readonly idiomas = IDIOMAS;
  protected readonly t = inject(TraduccionService).t;

  /**
   * El borrador arranca de la cuenta y se rehace si la cuenta cambia. Con `linkedSignal` no hace falta
   * un efecto que copie campo a campo, que es donde se cuelan los borradores de otra fila.
   */
  protected readonly modelo = linkedSignal(() => ({
    nombre: this.usuario().nombreVisible ?? '',
    empresa: this.usuario().empresa ?? '',
    pais: this.usuario().pais ?? '',
    idioma: this.usuario().idioma ?? 'es',
    activo: this.usuario().activo,
  }));

  protected readonly formulario = form(this.modelo, (ruta) => {
    // El país es opcional —vacío quiere decir «sin país»—, pero si se escribe algo tienen que ser las
    // dos letras que el backend compara con ISO-3166. El patrón admite minúsculas a propósito: quien
    // teclea «es» no se ha equivocado, y la conversión a mayúsculas se hace al enviar (`envia`).
    // `maxLength` es lo que antes hacía el atributo `maxlength` de la plantilla: la directiva lo
    // proyecta al campo, así que se sigue sin poder teclear una tercera letra.
    maxLength(ruta.pais, 2, { message: () => this.t('login.error.bad_data') });
    pattern(ruta.pais, PAIS_ISO, { message: () => this.t('login.error.bad_data') });
  });

  protected nombreDelIdioma(codigo: string): string {
    return nombreDeIdioma(codigo);
  }

  /**
   * Un campo vacío viaja como NULO y no como cadena vacía: son cosas distintas para el backend —«no
   * tiene empresa» frente a «su empresa se llama “”»— y el segundo caso rompía después los listados.
   *
   * <p>El código de país va SIEMPRE en mayúsculas: el backend compara con ISO-3166 alfa-2 tal cual.
   */
  protected envia(): void {
    const datos = this.modelo();
    this.guarda.emit({
      nombreVisible: datos.nombre.trim() || null,
      empresa: datos.empresa.trim() || null,
      pais: datos.pais.trim().toUpperCase() || null,
      idioma: datos.idioma || null,
      activo: datos.activo,
    });
  }
}
