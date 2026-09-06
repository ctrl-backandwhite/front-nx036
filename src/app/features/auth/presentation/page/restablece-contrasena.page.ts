import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faCircleCheck,
  faCircleNodes,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { RequisitosContrasena } from '@ds/component/contrasena/requisitos-contrasena';
import { contrasenaValida } from '@shared/validation/politica-contrasena';
import { RestableceContrasena } from '../../application/use-case/restablece-contrasena.use-case';

/** Lo que se espera antes de llevar al acceso: lo justo para leer el aviso. */
const ESPERA_ANTES_DEL_ACCESO_MS = 1800;

/**
 * Restablecer la contraseña. UNA dirección con dos modos:
 * <ul>
 *   <li>Sin testigo → se pide el correo y se manda el enlace. La respuesta es NEUTRA: no dice si la
 *       dirección existe, porque decirlo sería una forma de averiguar quién está registrado.</li>
 *   <li>Con `?token=…` (el enlace del correo) → contraseña nueva, repetición y la lista de requisitos
 *       que se va marcando, la misma que aplica el servidor.</li>
 * </ul>
 */
@Component({
  selector: 'nx-restablece-contrasena',
  imports: [RouterLink, FaIconComponent, RequisitosContrasena],
  template: `
    <div class="min-h-screen flex items-center justify-center px-4 bg-base-200">
      <div class="w-full max-w-md">
        <a routerLink="/" class="flex items-center justify-center gap-2 mb-6 font-bold text-lg">
          <!-- La marca es «NX036», sin la forma societaria. -->
          <fa-icon [icon]="iconos.marca" class="text-primary" />
          NX036
        </a>
        <div class="card bg-base-100 shadow-xl border border-base-200">
          <div class="card-body">
            <h1 class="text-2xl font-semibold">
              {{ t(token() ? 'reset.new_title' : 'reset.title') }}
            </h1>
            <p class="text-sm opacity-70 mt-1">
              {{ t(token() ? 'reset.new_subtitle' : 'reset.subtitle') }}
            </p>

            @if (mensaje(); as texto) {
              @if (estado() === 'ok') {
                <div role="alert" class="alert alert-success mt-5 py-2 text-sm">
                  <fa-icon [icon]="iconos.hecho" /> <span>{{ texto }}</span>
                </div>
              }
              @if (estado() === 'error') {
                <div role="alert" class="alert alert-error mt-5 py-2 text-sm">
                  <fa-icon [icon]="iconos.aviso" /> <span>{{ texto }}</span>
                </div>
              }
            }

            @if (!token() && estado() !== 'ok') {
              <form (submit)="pideElEnlace($event)" class="mt-5 space-y-4">
                <div>
                  <label for="reset-email" class="text-sm opacity-80 mb-1 block">{{ t('login.email') }}</label>
                  <input id="reset-email" type="email" required autocomplete="email"
                         class="input input-bordered w-full" [placeholder]="t('login.email_placeholder')"
                         [value]="correo()" (input)="correo.set(valorDe($event))" />
                </div>
                <button type="submit" class="btn btn-primary w-full" [disabled]="estado() === 'enviando'">
                  {{ t(estado() === 'enviando' ? 'reset.sending' : 'reset.send_link') }}
                </button>
              </form>
            }

            @if (token() && estado() !== 'ok') {
              <form (submit)="fijaLaNueva($event)" class="mt-5 space-y-3">
                <div>
                  <label for="reset-nueva" class="text-sm opacity-80 mb-1 block">{{ t('profile.new_password') }}</label>
                  <input id="reset-nueva" type="password" required minlength="8" autocomplete="new-password"
                         class="input input-bordered w-full"
                         [value]="nueva()" (input)="nueva.set(valorDe($event))" />
                </div>
                <div>
                  <label for="reset-repite" class="text-sm opacity-80 mb-1 block">{{ t('profile.confirm_password') }}</label>
                  <input id="reset-repite" type="password" required minlength="8" autocomplete="new-password"
                         class="input input-bordered w-full"
                         [value]="repite()" (input)="repite.set(valorDe($event))" />
                  @if (noCoinciden()) {
                    <span role="alert" class="text-xs text-error mt-1 block">{{ t('profile.passwords_mismatch') }}</span>
                  }
                </div>
                <nx-requisitos-contrasena [contrasena]="nueva()" />
                <button type="submit" class="btn btn-primary w-full"
                        [disabled]="estado() === 'enviando' || !puedeGuardar()">
                  {{ t(estado() === 'enviando' ? 'reset.saving' : 'profile.change_password') }}
                </button>
              </form>
            }

            <div class="mt-5 text-center">
              <a routerLink="/login" class="link link-primary link-hover text-sm">{{ t('activate.back_login') }}</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class RestableceContrasenaPage {
  private readonly traduccion = inject(TraduccionService);
  private readonly restablece = inject(RestableceContrasena);
  private readonly router = inject(Router);

  protected readonly t = this.traduccion.t;

  /** El testigo del enlace del correo. Lo ata el enrutador desde `?token=…`. */
  readonly token = input('');

  protected readonly correo = signal('');
  protected readonly nueva = signal('');
  protected readonly repite = signal('');
  protected readonly estado = signal<'inicial' | 'enviando' | 'ok' | 'error'>('inicial');
  protected readonly mensaje = signal<string | null>(null);

  protected readonly noCoinciden = computed(
    () => this.repite().length > 0 && this.nueva() !== this.repite(),
  );
  protected readonly puedeGuardar = computed(
    () => contrasenaValida(this.nueva()) && this.nueva() === this.repite(),
  );

  protected readonly iconos = {
    marca: faCircleNodes,
    hecho: faCircleCheck,
    aviso: faTriangleExclamation,
  };

  private salto: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // El salto al acceso es diferido para que dé tiempo a leer el aviso. Si quien mira se va antes
    // —pulsa «Volver» o el botón atrás—, el temporizador seguía vivo y la arrastraba desde donde
    // estuviera: se cancela al desmontar.
    inject(DestroyRef).onDestroy(() => {
      if (this.salto) {
        clearTimeout(this.salto);
      }
    });
  }

  protected valorDe(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  protected async pideElEnlace(evento: Event): Promise<void> {
    evento.preventDefault();
    const correo = this.correo().trim();
    if (!correo) {
      return;
    }
    this.estado.set('enviando');
    this.mensaje.set(null);
    const resultado = await this.restablece.solicitaElEnlace(correo);
    if (resultado.ok) {
      this.estado.set('ok');
      this.mensaje.set(this.t('reset.request_ok'));
      return;
    }
    this.estado.set('error');
    this.mensaje.set(resultado.error.mensaje || this.t('reset.request_error'));
  }

  protected async fijaLaNueva(evento: Event): Promise<void> {
    evento.preventDefault();
    if (!this.puedeGuardar()) {
      return;
    }
    this.estado.set('enviando');
    this.mensaje.set(null);
    const resultado = await this.restablece.fijaLaNueva(this.token(), this.nueva());
    if (resultado.ok) {
      this.estado.set('ok');
      this.mensaje.set(this.t('reset.confirm_ok'));
      this.salto = setTimeout(
        () => void this.router.navigateByUrl('/login'),
        ESPERA_ANTES_DEL_ACCESO_MS,
      );
      return;
    }
    this.estado.set('error');
    this.mensaje.set(resultado.error.mensaje || this.t('reset.confirm_error'));
  }
}
