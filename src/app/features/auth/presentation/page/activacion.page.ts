import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faCircleCheck,
  faCircleNodes,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { ActivaCuenta } from '../../application/use-case/activa-cuenta.use-case';

/** Lo que se espera antes de llevar al acceso: lo justo para leer el «cuenta activada». */
const ESPERA_ANTES_DEL_ACCESO_MS = 1800;
/** Segundos de espera entre reenvíos. Sin ellos, el botón se convierte en un grifo de correos. */
const ESPERA_ENTRE_REENVIOS_S = 30;

/**
 * La activación de la cuenta.
 *
 * <p>NO se pide ningún código a mano. El correo de alta lleva solo el botón «Confirmar cuenta», sin
 * ningún código a la vista: la casilla que hubo aquí pedía algo que nunca se daba, y quien llegaba sin
 * el enlace se quedaba mirándola sin poder rellenarla. Con enlace la activación es automática; sin él,
 * lo único que hay que hacer es ir al correo — o pedir que lo manden otra vez.
 *
 * <p>El código llega por la dirección y entra como ENTRADA del componente: el enrutador está configurado
 * para atar los parámetros de consulta a las entradas, así que no hace falta inyectarlo ni suscribirse.
 */
@Component({
  selector: 'nx-activacion',
  imports: [RouterLink, FaIconComponent],
  template: `
    <div class="min-h-screen flex items-center justify-center px-4 bg-base-200">
      <div class="w-full max-w-md">
        <a routerLink="/" class="flex items-center justify-center gap-2 mb-6 font-bold text-lg">
          <fa-icon [icon]="iconos.marca" class="text-primary" />
          NX036
        </a>
        <div class="card bg-base-100 shadow-xl border border-base-200">
          <div class="card-body">
            <h1 class="text-2xl font-semibold">{{ t('activate.title') }}</h1>
            <p class="text-sm opacity-70 mt-1">{{ t('activate.subtitle') }}</p>

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

            @if (estado() === 'activando') {
              <p class="mt-5 text-sm opacity-70">{{ t('activate.submitting') }}</p>
            }
            @if (!code() && estado() === 'inicial') {
              <p class="mt-5 text-sm opacity-80">{{ t('activate.check_email') }}</p>
            }

            <!-- Reenvío del correo. Es la única salida cuando no llegó o caducó. -->
            <div class="mt-6 pt-5 border-t border-base-200">
              <p class="text-sm font-medium">{{ t('activate.resend_q') }}</p>
              <p class="text-[12px] opacity-60 mb-2">{{ t('activate.resend_hint') }}</p>
              <form (submit)="reenvia($event)" class="flex flex-col sm:flex-row gap-2">
                <label class="sr-only" for="activacion-email">{{ t('activate.email_placeholder') }}</label>
                <input id="activacion-email" type="email" required autocomplete="email"
                       class="input input-bordered input-sm flex-1"
                       [placeholder]="t('activate.email_placeholder')"
                       [value]="correo()" (input)="correo.set(valorDe($event))" />
                <button type="submit" class="btn btn-outline btn-sm whitespace-nowrap"
                        [disabled]="!correo() || reenviando() || espera() > 0">
                  @if (reenviando()) {
                    {{ t('activate.resend_sending') }}
                  } @else if (espera() > 0) {
                    {{ textoDeEspera() }}
                  } @else {
                    {{ t('activate.resend') }}
                  }
                </button>
              </form>
              @if (reenviado()) {
                <p role="status" class="mt-2 text-[12px] text-success">
                  <fa-icon [icon]="iconos.hecho" /> {{ t('activate.resend_sent') }}
                </p>
              }
            </div>

            <div class="mt-6 flex items-center justify-center gap-3 text-sm">
              <a routerLink="/login" class="link link-primary font-medium">{{ t('activate.back_login') }}</a>
              <span class="opacity-40">·</span>
              <a routerLink="/" class="link link-primary font-medium">{{ t('activate.back_store') }}</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ActivacionPage {
  private readonly traduccion = inject(TraduccionService);
  private readonly activaCuenta = inject(ActivaCuenta);
  private readonly router = inject(Router);

  protected readonly t = this.traduccion.t;

  /** Llegan de la dirección: `?code=…&email=…`. Los ata el enrutador. */
  readonly code = input('');
  readonly email = input('');

  protected readonly estado = signal<'inicial' | 'activando' | 'ok' | 'error'>('inicial');
  protected readonly mensaje = signal<string | null>(null);
  protected readonly correo = signal('');
  protected readonly reenviando = signal(false);
  protected readonly reenviado = signal(false);
  protected readonly espera = signal(0);

  protected readonly iconos = {
    marca: faCircleNodes,
    hecho: faCircleCheck,
    aviso: faTriangleExclamation,
  };

  private salto: ReturnType<typeof setTimeout> | null = null;
  private cuenta: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Con código en la dirección se activa sola: quien pulsa el botón del correo no tiene que hacer
    // nada más. El efecto lo dispara el propio parámetro, así que también funciona si cambia.
    effect(() => {
      const codigo = this.code();
      if (codigo) {
        void this.activa(codigo);
      }
    });
    effect(() => {
      const sugerido = this.email();
      if (sugerido) {
        this.correo.set(sugerido);
      }
    });
    inject(DestroyRef).onDestroy(() => this.paraLosRelojes());
  }

  protected valorDe(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  protected textoDeEspera(): string {
    return this.traduccion.tCon('activate.resend_cooldown', { s: this.espera() });
  }

  private async activa(codigo: string): Promise<void> {
    this.estado.set('activando');
    this.mensaje.set(null);
    const resultado = await this.activaCuenta.ejecuta(codigo);
    if (resultado.ok) {
      this.estado.set('ok');
      this.mensaje.set(this.t('activate.success'));
      // El salto al acceso es diferido para que dé tiempo a leerlo. Si quien mira se va antes, el
      // temporizador seguía vivo y la sacaba de donde estuviera: se cancela al desmontar.
      this.salto = setTimeout(
        () => void this.router.navigateByUrl('/login'),
        ESPERA_ANTES_DEL_ACCESO_MS,
      );
      return;
    }
    this.estado.set('error');
    this.mensaje.set(resultado.error.mensaje || this.t('activate.error'));
  }

  /**
   * Vuelve a pedir el correo. La respuesta es SIEMPRE la misma, salga bien o mal: si distinguiera,
   * este formulario sería una forma cómoda de averiguar qué direcciones están registradas.
   */
  protected async reenvia(evento: Event): Promise<void> {
    evento.preventDefault();
    const correo = this.correo().trim();
    if (!correo || this.reenviando() || this.espera() > 0) {
      return;
    }
    this.reenviando.set(true);
    await this.activaCuenta.reenviaElCorreo(correo);
    this.reenviando.set(false);
    this.reenviado.set(true);
    this.arrancaLaEspera();
  }

  private arrancaLaEspera(): void {
    this.espera.set(ESPERA_ENTRE_REENVIOS_S);
    this.cuenta = setInterval(() => {
      const quedan = this.espera() - 1;
      this.espera.set(Math.max(0, quedan));
      if (quedan <= 0 && this.cuenta) {
        clearInterval(this.cuenta);
        this.cuenta = null;
      }
    }, 1000);
  }

  private paraLosRelojes(): void {
    if (this.salto) {
      clearTimeout(this.salto);
    }
    if (this.cuenta) {
      clearInterval(this.cuenta);
    }
  }
}
