import { Component, computed, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCircle, faCircleCheck, faKey } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { requisitosDeContrasena } from '../../domain/model/perfil';
import {
  CONTRASENAS_DISTINTAS,
  CONTRASENA_DEBIL,
  CambiaContrasena,
} from '../../application/use-case/cambia-contrasena.use-case';

/**
 * Cambiar la contraseña.
 *
 * <p>Los requisitos se pintan en vivo mientras se escribe: son los MISMOS que aplica el backend, y
 * verlos cumplirse uno a uno evita el rechazo con la contraseña ya escrita dos veces.
 */
@Component({
  selector: 'nx-cambio-de-contrasena',
  imports: [FaIconComponent],
  template: `
    <h4 class="mt-6 mb-1 text-sm font-medium flex items-center gap-2">
      <fa-icon [icon]="iconos.llave" class="text-brand-600" /> {{ t('profile.change_password') }}
    </h4>
    <form class="mt-2 space-y-3 max-w-md mx-auto" (submit)="envia($event)">
      <div>
        <label for="perfil-pw-actual" class="text-xs text-ink-500">{{ t('profile.current_password') }}</label>
        <input id="perfil-pw-actual" type="password" autocomplete="current-password" required class="input mt-1"
               [value]="actual()" (input)="actual.set(valorDe($event))" />
      </div>
      <div>
        <label for="perfil-pw-nueva" class="text-xs text-ink-500">{{ t('profile.new_password') }}</label>
        <input id="perfil-pw-nueva" type="password" autocomplete="new-password" required minlength="8" class="input mt-1"
               [value]="nueva()" (input)="nueva.set(valorDe($event))" />
      </div>
      <div>
        <label for="perfil-pw-confirmar" class="text-xs text-ink-500">{{ t('profile.confirm_password') }}</label>
        <input id="perfil-pw-confirmar" type="password" autocomplete="new-password" required minlength="8" class="input mt-1"
               [value]="repetida()" (input)="repetida.set(valorDe($event))" />
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

  protected readonly actual = signal('');
  protected readonly nueva = signal('');
  protected readonly repetida = signal('');
  protected readonly guardando = signal(false);
  protected readonly aviso = signal<string | null>(null);
  protected readonly correcto = signal(false);

  protected readonly requisitos = computed(() => requisitosDeContrasena(this.nueva()));
  protected readonly noCoinciden = computed(
    () => this.repetida().length > 0 && this.nueva() !== this.repetida(),
  );
  protected readonly sePuedeEnviar = computed(
    () => this.requisitos().every((r) => r.cumple) && this.nueva() === this.repetida(),
  );

  protected valorDe(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
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
    this.aviso.set(null);
    this.guardando.set(true);
    try {
      const resultado = await this.cambia.ejecuta(this.actual(), this.nueva(), this.repetida());
      this.correcto.set(resultado.ok);
      if (resultado.ok) {
        this.aviso.set(this.t('profile.password_updated'));
        this.actual.set('');
        this.nueva.set('');
        this.repetida.set('');
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
