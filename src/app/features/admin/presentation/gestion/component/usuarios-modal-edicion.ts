import { Component, inject, input, linkedSignal, output } from '@angular/core';
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

/**
 * La ficha de edición de una cuenta.
 *
 * <p>Guarda lo que se ve: nombre, empresa, país e idioma, más el interruptor de activa. El PAPEL no está
 * aquí a propósito —se cambia desde la fila, con su confirmación— y el correo tampoco: cambiarlo es
 * cambiar la identidad con la que alguien entra, y eso no es una edición de ficha.
 *
 * <p>El PAÍS es el de REGISTRO. Es el que decide el margen del comprador, así que tocarlo aquí cambia lo
 * que se le cobra; por eso se limita a dos letras y se sube a mayúsculas al escribir, como el resto del
 * producto.
 *
 * <p>Los identificadores de los campos son fijos y no generados: solo hay una ficha abierta a la vez, y
 * lo importante es que cada `<label>` apunte a SU campo —sin `for`, un lector de pantalla no sabe decir
 * cuál es cuál y pulsar la etiqueta no enfoca nada.
 *
 * <p>MOBILE FIRST: los campos van en una columna y pasan a dos desde `sm`.
 */
@Component({
  selector: 'nx-usuarios-modal-edicion',
  imports: [VentanaModal],
  template: `
    <nx-ventana-modal
      [titulo]="t('admin.users.actions.edit') + ' · ' + usuario().email"
      (cierra)="cierra.emit()"
    >
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <label class="block" for="usuario-nombre">
          <span class="text-[12px] text-ink-500">{{ t('admin.users.col.name') }}</span>
          <input
            id="usuario-nombre"
            class="input w-full mt-1"
            [value]="nombre()"
            (input)="escribe(nombre, $event)"
          />
        </label>
        <label class="block" for="usuario-empresa">
          <span class="text-[12px] text-ink-500">{{ t('admin.users.col.company') }}</span>
          <input
            id="usuario-empresa"
            class="input w-full mt-1"
            [value]="empresa()"
            (input)="escribe(empresa, $event)"
          />
        </label>
        <label class="block" for="usuario-pais">
          <span class="text-[12px] text-ink-500">{{ t('admin.users.col.country') }}</span>
          <input
            id="usuario-pais"
            class="input w-full mt-1"
            maxlength="2"
            [value]="pais()"
            (input)="escribePais($event)"
          />
        </label>
        <label class="block" for="usuario-idioma">
          <span class="text-[12px] text-ink-500">{{ t('admin.users.col.language') }}</span>
          <select
            id="usuario-idioma"
            class="input w-full mt-1"
            [value]="idioma()"
            (change)="escribe(idioma, $event)"
          >
            @for (codigo of idiomas; track codigo) {
              <option [value]="codigo">{{ nombreDelIdioma(codigo) }}</option>
            }
          </select>
        </label>
        <label class="sm:col-span-2 flex items-center gap-2 text-[12px]" for="usuario-activo">
          <input
            id="usuario-activo"
            type="checkbox"
            [checked]="activo()"
            (change)="alternaActivo($event)"
          />
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
          [disabled]="guardando()"
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
  protected readonly nombre = linkedSignal(() => this.usuario().nombreVisible ?? '');
  protected readonly empresa = linkedSignal(() => this.usuario().empresa ?? '');
  protected readonly pais = linkedSignal(() => this.usuario().pais ?? '');
  protected readonly idioma = linkedSignal(() => this.usuario().idioma ?? 'es');
  protected readonly activo = linkedSignal(() => this.usuario().activo);

  protected nombreDelIdioma(codigo: string): string {
    return nombreDeIdioma(codigo);
  }

  protected escribe(destino: { set(valor: string): void }, evento: Event): void {
    destino.set((evento.target as HTMLInputElement | HTMLSelectElement).value);
  }

  /** El código de país va SIEMPRE en mayúsculas: el backend compara con ISO-3166 alfa-2 tal cual. */
  protected escribePais(evento: Event): void {
    this.pais.set((evento.target as HTMLInputElement).value.toUpperCase());
  }

  protected alternaActivo(evento: Event): void {
    this.activo.set((evento.target as HTMLInputElement).checked);
  }

  /**
   * Un campo vacío viaja como NULO y no como cadena vacía: son cosas distintas para el backend —«no
   * tiene empresa» frente a «su empresa se llama “”»— y el segundo caso rompía después los listados.
   */
  protected envia(): void {
    this.guarda.emit({
      nombreVisible: this.nombre().trim() || null,
      empresa: this.empresa().trim() || null,
      pais: this.pais().trim() || null,
      idioma: this.idioma() || null,
      activo: this.activo(),
    });
  }
}
