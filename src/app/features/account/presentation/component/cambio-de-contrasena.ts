import { Component, computed, inject, signal } from '@angular/core';
import { FieldTree, FormField, form, minLength, required, validate } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCircle, faCircleCheck, faKey } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { contrasenaCumpleLaPolitica, requisitosDeContrasena } from '../../domain/model/perfil';
import {
  CONTRASENAS_DISTINTAS,
  CONTRASENA_DEBIL,
  CambiaContrasena,
} from '../../application/use-case/cambia-contrasena.use-case';

/** Los ocho caracteres que exige la política. El mismo número que aplica el backend. */
const LARGO_MINIMO = 8;

/**
 * Cambiar la contraseña.
 *
 * <p>Los requisitos se pintan en vivo mientras se escribe: son los MISMOS que aplica el backend, y
 * verlos cumplirse uno a uno evita el rechazo con la contraseña ya escrita dos veces.
 *
 * <p>Las tres casillas las lleva Signal Forms. Lo obligatorio, el largo mínimo, la política y el hecho
 * de que las dos nuevas tengan que coincidir se declaran en el ESQUEMA, no como atributos del campo ni
 * como comprobaciones sueltas repartidas por la clase: la directiva `formField` proyecta ella misma
 * `required` y `minlength` al elemento, y hay UN solo sitio —`formulario().invalid()`— que decide si se
 * puede enviar.
 */
@Component({
  selector: 'nx-cambio-de-contrasena',
  imports: [FaIconComponent, FormField],
  template: `
    <h4 class="mt-6 mb-1 text-sm font-medium flex items-center gap-2">
      <fa-icon [icon]="iconos.llave" class="text-brand-600" /> {{ t('profile.change_password') }}
    </h4>
    <form class="mt-2 space-y-3 max-w-md mx-auto" (submit)="envia($event)">
      <div>
        <label for="perfil-pw-actual" class="text-xs text-ink-500">{{ t('profile.current_password') }}</label>
        <input id="perfil-pw-actual" type="password" autocomplete="current-password" class="input mt-1"
               [formField]="formulario.actual" />
        @if (falloDe(formulario.actual); as fallo) {
          <span role="alert" class="text-xs text-red-700 mt-1 block">{{ fallo }}</span>
        }
      </div>
      <div>
        <label for="perfil-pw-nueva" class="text-xs text-ink-500">{{ t('profile.new_password') }}</label>
        <input id="perfil-pw-nueva" type="password" autocomplete="new-password" class="input mt-1"
               [formField]="formulario.nueva" />
        @if (falloDe(formulario.nueva); as fallo) {
          <span role="alert" class="text-xs text-red-700 mt-1 block">{{ fallo }}</span>
        }
      </div>
      <div>
        <label for="perfil-pw-confirmar" class="text-xs text-ink-500">{{ t('profile.confirm_password') }}</label>
        <input id="perfil-pw-confirmar" type="password" autocomplete="new-password" class="input mt-1"
               [formField]="formulario.repetida" />
        @if (noCoinciden()) {
          <span role="alert" class="text-xs text-red-700 mt-1 block">{{ t('profile.passwords_mismatch') }}</span>
        }
      </div>

      <div class="rounded-box border border-ink-100 bg-ink-50/50 p-4">
        <ul class="grid grid-cols-2 gap-x-6 gap-y-2">
          @for (requisito of requisitos(); track requisito.clave; let ultimo = $last) {
            <li [class]="claseDeRequisito(requisito.cumple, ultimo)">
              <fa-icon [icon]="requisito.cumple ? iconos.hecho : iconos.pendiente" class="text-[11px]" />
              {{ t(requisito.clave) }}
            </li>
          }
        </ul>
      </div>

      <div class="flex items-center justify-center gap-3 pt-1 flex-wrap">
        <button type="submit" class="btn btn-primary" [disabled]="guardando() || !sePuedeEnviar()">
          {{ guardando() ? t('common.saving') : t('profile.change_password') }}
        </button>
        @if (aviso(); as mensaje) {
          <span role="alert" [class]="'text-xs ' + (correcto() ? 'text-emerald-700' : 'text-red-700')">
            {{ mensaje }}
          </span>
        }
      </div>
    </form>
  `,
})
export class CambioDeContrasena {
  private readonly traduccion = inject(TraduccionService);
  private readonly cambia = inject(CambiaContrasena);

  protected readonly t = this.traduccion.t;
  protected readonly iconos = { llave: faKey, hecho: faCircleCheck, pendiente: faCircle };

  protected readonly modelo = signal({ actual: '', nueva: '', repetida: '' });

  /**
   * El esquema del cambio de contraseña.
   *
   * <p>La política vive en el dominio y se declara aquí con `validate()` sin mensaje a propósito: la
   * lista de requisitos de abajo ya dice cuál falta, uno por uno y en vivo. Repetirlo bajo el campo
   * sería decir dos veces lo mismo con menos detalle.
   *
   * <p>Que las dos nuevas coincidan es una validación CRUZADA y por eso cuelga de la repetición: es ahí
   * donde se ve el aviso, que es donde estaba antes.
   */
  protected readonly formulario = form(this.modelo, (ruta) => {
    required(ruta.actual, { message: () => this.t('dialog.field.required') });

    required(ruta.nueva, { message: () => this.t('dialog.field.required') });
    minLength(ruta.nueva, LARGO_MINIMO);
    validate(ruta.nueva, ({ value }) =>
      contrasenaCumpleLaPolitica(value()) ? undefined : { kind: 'pattern' },
    );

    required(ruta.repetida, { message: () => this.t('dialog.field.required') });
    minLength(ruta.repetida, LARGO_MINIMO);
    validate(ruta.repetida, ({ value, valueOf }) =>
      value() !== '' && value() !== valueOf(ruta.nueva)
        ? { kind: 'mismatch', message: this.t('profile.passwords_mismatch') }
        : undefined,
    );
  });

  protected readonly guardando = signal(false);
  protected readonly aviso = signal<string | null>(null);
  protected readonly correcto = signal(false);

  protected readonly requisitos = computed(() => requisitosDeContrasena(this.modelo().nueva));

  /**
   * El aviso de que la repetición no coincide.
   *
   * <p>Este NO espera a que el campo se haya tocado, y es deliberado: no acusa de vacío a nadie —solo
   * salta cuando ya hay algo escrito—, y verlo mientras se teclea es justo lo que evita descubrir la
   * errata después de pulsar «cambiar».
   */
  protected readonly noCoinciden = computed(
    () => this.formulario.repetida().getError('mismatch') !== undefined,
  );

  /** Un único sitio al que preguntar si hay algo que mandar. */
  protected readonly sePuedeEnviar = computed(() => !this.formulario().invalid());

  /**
   * El mensaje que toca enseñar bajo un campo, o nulo si no hay nada que decir todavía. Se calla hasta
   * que el campo se ha TOCADO: pintar de rojo un formulario recién abierto acusa a quien todavía no ha
   * escrito nada.
   */
  protected falloDe<T>(campo: FieldTree<T>): string | null {
    const estado = campo();
    return estado.touched() ? (estado.errors()[0]?.message ?? null) : null;
  }

  /**
   * El último requisito, cuando son impares, se centra ocupando las dos columnas.
   *
   * <p>Es puro detalle visual y viene del original: sin él quedaba una fila coja con un hueco a la
   * derecha que parecía un fallo de maquetación.
   */
  protected claseDeRequisito(cumple: boolean, esElUltimo: boolean): string {
    const impar = this.requisitos().length % 2 === 1;
    const color = cumple ? 'text-emerald-700' : 'text-ink-400';
    const centrado = esElUltimo && impar ? ' col-span-2 justify-center' : '';
    return `flex items-center gap-2 text-xs ${color}${centrado}`;
  }

  protected async envia(evento: Event): Promise<void> {
    evento.preventDefault();
    if (!this.sePuedeEnviar()) {
      return;
    }
    this.aviso.set(null);
    this.guardando.set(true);
    try {
      const datos = this.modelo();
      const resultado = await this.cambia.ejecuta(datos.actual, datos.nueva, datos.repetida);
      this.correcto.set(resultado.ok);
      if (resultado.ok) {
        this.aviso.set(this.t('profile.password_updated'));
        this.modelo.set({ actual: '', nueva: '', repetida: '' });
        // Las casillas vuelven a estar sin tocar: si no, las tres recién vaciadas se pintarían en rojo
        // acusando de vacío a quien acaba de cambiar la contraseña bien.
        this.formulario().reset();
        return;
      }
      this.aviso.set(this.textoDelFallo(resultado.error.codigo, resultado.error.mensaje));
    } finally {
      this.guardando.set(false);
    }
  }

  /** Lo que rechaza el negocio llega por código; lo que rechaza el backend, ya redactado. */
  private textoDelFallo(codigo: string | undefined, mensaje: string): string {
    if (codigo === CONTRASENA_DEBIL) {
      return this.t('profile.password_min');
    }
    if (codigo === CONTRASENAS_DISTINTAS) {
      return this.t('profile.passwords_mismatch');
    }
    return mensaje || this.t('profile.password_err');
  }
}
