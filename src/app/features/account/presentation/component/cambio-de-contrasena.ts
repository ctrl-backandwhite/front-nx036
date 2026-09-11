import { Component, computed, inject, signal } from '@angular/core';
import { FieldTree, FormField, form, minLength, required, validate } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCircleCheck, faKey } from '@fortawesome/free-solid-svg-icons';
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

      <!--
        Los requisitos, con una BARRA que resume cuántos van cumplidos.
        Antes eran cinco puntos negros idénticos en una caja gris: sin escribir nada parecían viñetas
        muertas, y no se veía que la lista responde a lo que se teclea. Ahora cada requisito tiene su
        marca —hueca mientras falta, verde con el visto cuando se cumple— y la barra da de un vistazo
        lo que la lista da en detalle, que es lo que se mira mientras se escribe.
      -->
      <div class="rounded-box border border-ink-100 bg-ink-50/50 p-4">
        <div class="flex items-baseline justify-between gap-3">
          <span class="text-[11px] font-medium uppercase tracking-wide text-ink-500">
            {{ t('profile.pwd_req_title') }}
          </span>
          @if (modelo().nueva) {
            <span class="text-[11px] font-medium" [class]="fuerza().color">{{ t(fuerza().clave) }}</span>
          }
        </div>

        <div class="mt-2 flex gap-1" aria-hidden="true">
          @for (tramo of tramos; track tramo) {
            <span class="h-1 flex-1 rounded-full transition-colors"
                  [class]="tramo <= cumplidos() ? fuerza().fondo : 'bg-ink-200'"></span>
          }
        </div>

        <ul class="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
          @for (requisito of requisitos(); track requisito.clave; let ultimo = $last) {
            <li [class]="claseDeRequisito(requisito.cumple, ultimo)">
              <span class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-colors"
                    [class]="requisito.cumple ? 'bg-emerald-600 text-white' : 'border border-ink-300 text-transparent'">
                <fa-icon [icon]="iconos.hecho" class="text-[9px]" />
              </span>
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
  // El «pendiente» ya no es un icono: es el propio círculo hueco de la marca, sin dibujo dentro.
  protected readonly iconos = { llave: faKey, hecho: faCircleCheck };

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

  /** Un tramo de barra por requisito: la barra y la lista cuentan lo mismo, no dos cosas distintas. */
  protected readonly tramos = [1, 2, 3, 4, 5];

  protected readonly cumplidos = computed(
    () => this.requisitos().filter((requisito) => requisito.cumple).length,
  );

  /**
   * Cómo de segura va la contraseña, en tres tramos.
   *
   * <p>Se calcula sobre los requisitos YA cumplidos y no con una fórmula propia de entropía: decir
   * «segura» con una regla distinta de la que luego rechaza el envío sería contradecirse en la misma
   * pantalla.
   */
  protected readonly fuerza = computed(() => {
    const n = this.cumplidos();
    if (n >= this.requisitos().length) {
      return { clave: 'profile.pwd_strength_strong', color: 'text-emerald-700', fondo: 'bg-emerald-600' };
    }
    if (n >= 3) {
      return { clave: 'profile.pwd_strength_fair', color: 'text-amber-700', fondo: 'bg-amber-500' };
    }
    return { clave: 'profile.pwd_strength_weak', color: 'text-red-700', fondo: 'bg-red-500' };
  });

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
    // Lo cumplido se apaga y lo que falta se lee: al revés, la lista invitaba a mirar lo ya resuelto.
    const color = cumple ? 'text-ink-400' : 'text-ink-700';
    // El centrado del último solo tiene sentido en DOS columnas; en el móvil va en una y sobra.
    const centrado = esElUltimo && impar ? ' sm:col-span-2 sm:justify-center' : '';
    return `flex items-center gap-2 text-xs transition-colors ${color}${centrado}`;
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
