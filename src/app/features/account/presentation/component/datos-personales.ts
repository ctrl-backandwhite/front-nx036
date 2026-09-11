import { Component, computed, effect, inject, signal } from '@angular/core';
import { FieldTree, FormField, form, maxLength, required } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCheck, faTriangleExclamation, faUser } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { SelectorPais } from '@ds/component/pais/selector-pais';
import { Telefono } from '@ds/component/telefono/telefono';
import { DatosDePerfil, IDIOMAS_DEL_PERFIL } from '../../domain/model/perfil';
import { CuentaStore } from '../../application/state/cuenta.store';
import { GuardaPerfil } from '../../application/use-case/guarda-perfil.use-case';

/** Lo que acepta el backend en cada parte del nombre. Sin esto, el rechazo llega tras pulsar «guardar». */
const LARGO_DEL_NOMBRE = 80;

/**
 * Los datos personales de la cuenta.
 *
 * <p>El correo no se edita aquí: cambiarlo es cambiar de identidad y pasa por una verificación aparte.
 * El PAPEL tampoco se enseña: expondría el modelo de permisos de la aplicación.
 *
 * <p>El formulario lo lleva Signal Forms sobre la MISMA señal que ya se resembraba desde la cuenta, sin
 * copia intermedia. Lo obligatorio y los largos se declaran en el esquema y no como atributos del campo:
 * la directiva los proyecta ella misma al elemento, así la pantalla y la regla no pueden acabar diciendo
 * cosas distintas, y hay un único sitio —`formulario().invalid()`— que decide si se puede guardar.
 *
 * <p>Mobile first: una columna, y dos desde `sm`.
 */
@Component({
  selector: 'nx-datos-personales',
  imports: [FaIconComponent, SelectorPais, Telefono, FormField],
  template: `
    <section class="card p-5">
      <h3 class="flex items-center gap-2">
        <fa-icon [icon]="iconos.persona" class="text-brand-600" /> {{ t('profile.section.personal') }}
      </h3>
      <form class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4" (submit)="envia($event)">
        <div>
          <label for="perfil-email" class="text-xs text-ink-500">{{ t('profile.email') }}</label>
          <!--
            El correo NO forma parte del formulario: no se edita aquí, así que no tiene campo ni estado
            que validar. Se pinta como dato, con el valor que llega del titular.
          -->
          <input id="perfil-email" class="input mt-1 bg-ink-50" disabled [value]="correo()" />
        </div>

        <div>
          <label for="perfil-nombre" class="text-xs text-ink-500">{{ t('profile.first_name') }}</label>
          <input id="perfil-nombre" class="input mt-1" [formField]="formulario.nombre" />
          @if (falloDe(formulario.nombre); as fallo) {
            <span role="alert" class="text-xs text-red-700 mt-1 block">{{ fallo }}</span>
          }
        </div>

        <div>
          <label for="perfil-apellido-1" class="text-xs text-ink-500">{{ t('profile.last_name_1') }}</label>
          <input id="perfil-apellido-1" class="input mt-1" [formField]="formulario.primerApellido" />
        </div>

        <div>
          <label for="perfil-apellido-2" class="text-xs text-ink-500">{{ t('profile.last_name_2') }}</label>
          <input id="perfil-apellido-2" class="input mt-1" [formField]="formulario.segundoApellido" />
        </div>

        <div>
          <label for="perfil-empresa" class="text-xs text-ink-500">{{ t('profile.company') }}</label>
          <input id="perfil-empresa" class="input mt-1" [formField]="formulario.empresa" />
        </div>

        <div>
          <span class="text-xs text-ink-500">{{ t('profile.phone') }}</span>
          <!--
            El rótulo del PREFIJO se queda en el del sistema de diseño: llamarlo «país», como el país de
            la cuenta que hay justo debajo, dejaría dos desplegables con el mismo nombre accesible.

            El teléfono es una pieza del sistema de diseño y no habla el protocolo de Signal Forms, así
            que se ata al VALOR del campo en vez de con la directiva; el estado sigue en el formulario.

            El prefijo arranca en el PAÍS DE LA CUENTA, que está en el campo de aquí abajo. Antes
            arrancaba siempre en «+34» porque el componente no tenía de dónde sacarlo, y a quien se da
            de alta desde Bogotá le proponía un prefijo español delante de su propio número. Se ata al
            valor del campo y no a una copia: si el país cambia, el prefijo le sigue mientras no haya
            número escrito.
          -->
          <nx-telefono clase="mt-1" [valor]="formulario.telefono().value()"
                       (valorChange)="formulario.telefono().value.set($event)"
                       [paisPorDefecto]="formulario.pais().value()"
                       [etiquetaNumero]="t('profile.phone')" />
        </div>

        <div>
          <span class="text-xs text-ink-500">{{ t('profile.country') }}</span>
          <!--
            El país de REGISTRO. Lo detecta la dirección de red al darse de alta y es el que fija el
            margen y, con él, el precio de todo el escaparate. Por eso un cliente NO lo edita: solo
            quien administra. Y por eso tampoco se toca desde las direcciones de envío — cambiar adónde
            se manda un paquete no puede cambiar lo que cuesta.
          -->
          <nx-selector-pais [valor]="formulario.pais().value()"
                            (valorChange)="formulario.pais().value.set($event)"
                            [soloLectura]="!cuenta.puedeCambiarElPais()" [etiqueta]="t('profile.country')" />
        </div>

        <div>
          <label for="perfil-idioma" class="text-xs text-ink-500">{{ t('profile.language') }}</label>
          <!-- La opción marcada la elige la directiva a partir del valor del campo: no hace falta
               repetirlo con un [selected] por opción, que era otro sitio más donde equivocarse. -->
          <select id="perfil-idioma" class="input mt-1" [formField]="formulario.idioma">
            @for (idioma of idiomas; track idioma.codigo) {
              <option [value]="idioma.codigo">{{ idioma.nombre }}</option>
            }
          </select>
        </div>

        <div class="sm:col-span-2 flex items-center gap-3">
          <button type="submit" class="btn btn-primary" [disabled]="guardando() || formulario().invalid()">
            {{ guardando() ? t('common.saving') : t('profile.save') }}
          </button>
          @if (aviso(); as mensaje) {
            <span role="alert" [class]="'text-xs flex items-center gap-1 ' + (correcto() ? 'text-emerald-700' : 'text-red-700')">
              <fa-icon [icon]="correcto() ? iconos.bien : iconos.mal" /> {{ mensaje }}
            </span>
          }
        </div>
      </form>
    </section>
  `,
})
export class DatosPersonales {
  private readonly traduccion = inject(TraduccionService);
  private readonly guarda = inject(GuardaPerfil);

  protected readonly cuenta = inject(CuentaStore);
  protected readonly t = this.traduccion.t;
  protected readonly idiomas = IDIOMAS_DEL_PERFIL;
  protected readonly iconos = { persona: faUser, bien: faCheck, mal: faTriangleExclamation };

  protected readonly datos = signal<DatosDePerfil>(this.cuenta.datosDelFormulario());

  /**
   * El esquema del perfil.
   *
   * <p>El nombre es lo único imprescindible: es lo que aparece en las facturas y en el albarán, y una
   * cuenta sin él deja al transportista sin destinatario. Los apellidos y la empresa son opcionales,
   * pero con el mismo largo que acepta el backend para que el rechazo no llegue tarde.
   *
   * <p>El mensaje va como FUNCIÓN para que se rehaga al cambiar de idioma sin volver a montar el campo.
   */
  protected readonly formulario = form(this.datos, (ruta) => {
    required(ruta.nombre, { message: () => this.t('dialog.field.required') });
    maxLength(ruta.nombre, LARGO_DEL_NOMBRE, { message: () => this.t('dialog.field.maxlength') });
    maxLength(ruta.primerApellido, LARGO_DEL_NOMBRE, { message: () => this.t('dialog.field.maxlength') });
    maxLength(ruta.segundoApellido, LARGO_DEL_NOMBRE, { message: () => this.t('dialog.field.maxlength') });
    required(ruta.idioma, { message: () => this.t('dialog.field.required') });
  });

  protected readonly guardando = signal(false);
  protected readonly aviso = signal<string | null>(null);
  protected readonly correcto = signal(false);

  protected readonly correo = computed(() => this.cuenta.titular()?.email ?? '');

  constructor() {
    // El formulario se resiembra cuando se resuelve quién mira, y también después de guardar: el
    // servidor normaliza el teléfono y puede recortar los nombres, así que lo que se ve tiene que ser lo
    // que quedó guardado, no lo que se tecleó.
    effect(() => this.datos.set(this.cuenta.datosDelFormulario()));
  }

  /**
   * El mensaje que toca enseñar bajo un campo, o nulo si no hay nada que decir todavía. Se calla hasta
   * que el campo se ha TOCADO: pintar de rojo un formulario recién abierto acusa a quien todavía no ha
   * escrito nada.
   */
  protected falloDe<T>(campo: FieldTree<T>): string | null {
    const estado = campo();
    return estado.touched() ? (estado.errors()[0]?.message ?? null) : null;
  }

  protected async envia(evento: Event): Promise<void> {
    evento.preventDefault();
    if (this.formulario().invalid()) {
      return;
    }
    this.aviso.set(null);
    this.guardando.set(true);
    try {
      const resultado = await this.guarda.ejecuta(this.datos());
      this.correcto.set(resultado.ok);
      // Sin este aviso, un rechazo del servidor —un teléfono imposible, un país no admitido— dejaba la
      // pantalla exactamente igual que antes de pulsar y el cliente se iba creyendo que había guardado.
      this.aviso.set(
        resultado.ok ? this.t('profile.saved') : resultado.error.mensaje || this.t('common.error'),
      );
    } finally {
      this.guardando.set(false);
    }
  }
}
