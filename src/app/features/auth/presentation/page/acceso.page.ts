import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faGithub, faGoogle } from '@fortawesome/free-brands-svg-icons';
import {
  faArrowLeft,
  faEye,
  faEyeSlash,
  faShield,
  faSignInAlt,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { FormField, email as validaEmail, form, required } from '@angular/forms/signals';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { APP_CONFIG } from '@core/config/app-config';
import { IniciaSesion } from '../../application/use-case/inicia-sesion.use-case';
import { RESUMEN_DE_ALMACENES_PORT } from '../../domain/port/resumen-de-almacenes.port';
import { PanelDeMarca } from '../component/panel-de-marca';

/**
 * La pantalla de acceso.
 *
 * <p>Se ocupa de UNA cosa: recoger las credenciales y decidir adónde va quien acaba de entrar. Quién
 * valida, quién guarda la sesión y quién habla con el backend son otros —el caso de uso y su adaptador—,
 * así que esta clase no crece cuando cambia la autenticación.
 *
 * <p>MOBILE FIRST: en el móvil hay una sola columna con el formulario, que es lo único que importa
 * ahí; el panel de marca aparece a partir de `lg`. Por eso la rejilla se declara sin prefijo y se amplía
 * con `lg:grid-cols-2`, y no al revés.
 */
@Component({
  selector: 'nx-acceso',
  imports: [RouterLink, FaIconComponent, FormField, PanelDeMarca],
  template: `
    <div class="min-h-screen grid lg:grid-cols-2 bg-base-100">
      <nx-panel-de-marca [textoDeAlmacenes]="textoDeAlmacenes()" />

      <div class="flex items-center justify-center px-4 py-12 lg:px-12 bg-base-100">
        <div class="card w-full max-w-md bg-base-100 shadow-xl border border-base-200">
          <div class="card-body">
            <a routerLink="/" class="flex lg:hidden items-center justify-center gap-2 mb-2 font-bold text-lg">
              <fa-icon [icon]="iconos.marca" class="text-primary" />
              NX036
            </a>

            <!-- Esta pantalla va sin la cabecera de la tienda: sin este enlace no hay forma de volver. -->
            <a routerLink="/" class="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mb-3 self-start">
              <fa-icon [icon]="iconos.atras" class="text-[12px]" />
              {{ t('common.back_to_store') }}
            </a>

            <h1 class="text-2xl font-semibold">{{ t('login.title') }}</h1>

            @if (avisoDeAccesoSocial(); as aviso) {
              <div role="alert" class="alert mt-4 py-2 text-[13px]" [class.alert-warning]="exigeVincular()" [class.alert-error]="!exigeVincular()">
                <fa-icon [icon]="exigeVincular() ? iconos.escudo : iconos.aviso" />
                <span>{{ aviso }}</span>
              </div>
            }

            @if (error(); as mensaje) {
              <div role="alert" class="alert alert-error mt-5 py-2 text-sm">
                <fa-icon [icon]="iconos.aviso" />
                <span>{{ mensaje }}</span>
              </div>
            }

            <div class="mt-6 grid grid-cols-2 gap-2">
              <button type="button" class="btn btn-outline btn-sm justify-center gap-2"
                      [attr.aria-label]="t('login.sso.google')" (click)="entraCon('google')">
                <fa-icon [icon]="iconos.google" class="text-[16px]" />
                <span class="text-[12px] capitalize">{{ t('login.sso.google') }}</span>
              </button>
              <button type="button" class="btn btn-outline btn-sm justify-center gap-2"
                      [attr.aria-label]="t('login.sso.github')" (click)="entraCon('github')">
                <fa-icon [icon]="iconos.github" class="text-[16px]" />
                <span class="text-[12px] capitalize">{{ t('login.sso.github') }}</span>
              </button>
            </div>

            <div class="divider text-[11px] uppercase tracking-wider opacity-60 my-5">{{ t('login.or_email') }}</div>

            <form (submit)="envia($event)" class="mt-2 space-y-4">
              <div>
                <!--
                  Cada campo con su etiqueta asociada: sin ella, un lector de pantalla anuncia «cuadro de
                  edición» sin decir cuál, y quien no ve la pantalla no sabe si escribe el correo, la
                  contraseña o el código.
                -->
                <label for="acceso-email" class="text-sm opacity-80 mb-1 block">{{ t('login.email') }}</label>
                <input id="acceso-email" type="email" autocomplete="email" class="input input-bordered w-full"
                       [formField]="formulario.email" [placeholder]="t('login.email_placeholder')" />
              </div>

              <div>
                <label for="acceso-clave" class="text-sm opacity-80 mb-1 block">{{ t('login.password') }}</label>
                <div class="relative">
                  <input id="acceso-clave" [type]="claveVisible() ? 'text' : 'password'" autocomplete="current-password"
                         class="input input-bordered w-full pr-10" [formField]="formulario.contrasena" />
                  <button type="button" class="absolute inset-y-0 right-2 px-2 opacity-60 hover:opacity-100"
                          [attr.aria-label]="t(claveVisible() ? 'login.hide_password' : 'login.show_password')"
                          (click)="claveVisible.set(!claveVisible())">
                    <fa-icon [icon]="claveVisible() ? iconos.ocultar : iconos.ver" />
                  </button>
                </div>
              </div>

              @if (pideSegundoFactor()) {
                <div>
                  <div role="alert" class="alert py-2 text-[13px] mb-2">
                    <fa-icon [icon]="iconos.escudo" class="text-primary" />
                    <span>{{ t('login.otp.prompt') }}</span>
                  </div>
                  <label for="acceso-codigo" class="text-sm opacity-80 mb-1 block">{{ t('login.otp.label') }}</label>
                  <input id="acceso-codigo" type="text" inputmode="numeric" autocomplete="one-time-code"
                         class="input input-bordered w-full tracking-[0.3em] text-center"
                         [formField]="formulario.codigo" [placeholder]="t('login.otp.placeholder')" />
                  <p class="text-[11px] opacity-60 mt-1">{{ t('login.otp.hint') }}</p>
                </div>
              }

              <div class="flex items-center justify-between text-sm">
                <a routerLink="/password-reset" class="link link-primary link-hover">{{ t('login.forgot') }}</a>
              </div>

              <button type="submit" class="btn btn-primary w-full" [disabled]="enviando()">
                @if (enviando()) {
                  <span class="loading loading-spinner loading-sm"></span> {{ t('login.signing_in') }}
                } @else {
                  <fa-icon [icon]="iconos.entrar" /> {{ t('login.submit') }}
                }
              </button>
            </form>

            <div class="mt-6 text-center text-sm opacity-70">
              {{ t('login.no_account') }}
              <a routerLink="/register" class="link link-primary font-medium">{{ t('login.register') }}</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AccesoPage {
  private readonly traduccion = inject(TraduccionService);
  private readonly iniciaSesion = inject(IniciaSesion);
  private readonly almacenes = inject(RESUMEN_DE_ALMACENES_PORT);
  private readonly config = inject(APP_CONFIG);
  private readonly router = inject(Router);

  protected readonly t = this.traduccion.t;

  protected readonly modelo = signal({ email: '', contrasena: '', codigo: '' });
  protected readonly formulario = form(this.modelo, (ruta) => {
    required(ruta.email);
    validaEmail(ruta.email);
    required(ruta.contrasena);
  });

  protected readonly claveVisible = signal(false);
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  /**
   * Se pide el segundo factor cuando el backend ha rechazado el primer intento diciéndolo. No se
   * pregunta antes: quién tiene doble factor activo es cosa de la cuenta, no del formulario.
   */
  protected readonly pideSegundoFactor = signal(false);

  private readonly resumen = signal<{ cuantos: number; paises: readonly string[] } | null>(null);

  /** Con cifras reales si se pudieron consultar; genérico —sin números— mientras tanto. */
  protected readonly textoDeAlmacenes = computed(() => {
    const datos = this.resumen();
    if (!datos || datos.cuantos === 0) {
      return this.t('login.brand.perk3_generic');
    }
    return this.traduccion.tCon('login.brand.perk3', {
      count: datos.cuantos,
      countries: datos.paises.join(', '),
    });
  });

  private readonly parametros = new URLSearchParams(
    typeof location === 'undefined' ? '' : location.search,
  );
  protected readonly exigeVincular = signal(this.parametros.get('link') === 'required');

  protected readonly avisoDeAccesoSocial = computed(() => {
    if (this.exigeVincular()) {
      return this.t('login.google.link_required');
    }
    const fallo = this.parametros.get('error');
    const claves: Record<string, string> = {
      google_email_unverified: 'login.google.email_unverified',
      google_no_email: 'login.google.no_email',
      google: 'login.google.failed',
    };
    return fallo && claves[fallo] ? this.t(claves[fallo]) : null;
  });

  protected readonly iconos = {
    marca: faShield,
    atras: faArrowLeft,
    aviso: faTriangleExclamation,
    escudo: faShield,
    ver: faEye,
    ocultar: faEyeSlash,
    entrar: faSignInAlt,
    google: faGoogle,
    github: faGithub,
  };

  constructor() {
    void this.cargaResumenDeAlmacenes();
  }

  protected async envia(evento: Event): Promise<void> {
    evento.preventDefault();
    if (this.formulario().invalid()) {
      return;
    }
    this.error.set(null);
    this.enviando.set(true);
    try {
      const datos = this.modelo();
      const resultado = await this.iniciaSesion.ejecuta({
        email: datos.email.trim(),
        contrasena: datos.contrasena,
        vinculaAccesoSocial: this.exigeVincular(),
        codigoDeUnSoloUso: this.pideSegundoFactor() ? datos.codigo.trim() : undefined,
      });

      if (resultado.ok) {
        const esPersonal = resultado.valor.rol === 'ADMIN' || resultado.valor.rol === 'OPERATOR';
        await this.router.navigateByUrl(this.destino() ?? (esPersonal ? '/admin' : '/catalog'), {
          replaceUrl: true,
        });
        return;
      }
      this.pintaElFallo(resultado.error.codigo, resultado.error.mensaje);
    } finally {
      this.enviando.set(false);
    }
  }

  /**
   * Traduce el fallo a lo que hay que enseñar. Los mensajes vienen ya localizados del backend; aquí solo
   * se decide si además hay que cambiar de paso.
   */
  private pintaElFallo(codigo: string | undefined, mensaje: string): void {
    if (codigo === 'MFA_REQUIRED') {
      // La contraseña era correcta: la cuenta pide segundo factor. No es un error, es el paso siguiente.
      this.pideSegundoFactor.set(true);
      this.error.set(null);
      return;
    }
    if (codigo === 'MFA_INVALID') {
      this.pideSegundoFactor.set(true);
      this.error.set(this.t('login.error.otp_invalid'));
      return;
    }
    if (this.pideSegundoFactor()) {
      // Veníamos del paso del código y ha fallado la credencial: se vuelve al paso de la contraseña.
      this.pideSegundoFactor.set(false);
      this.modelo.update((m) => ({ ...m, codigo: '' }));
    }
    this.error.set(mensaje || this.t('login.error.generic'));
  }

  /**
   * El acceso social sale del navegador y vuelve, así que el destino pretendido no sobrevive en memoria:
   * se deja escrito antes de saltar al proveedor.
   */
  protected entraCon(proveedor: 'google' | 'github'): void {
    const volverA = this.destino();
    if (volverA) {
      try {
        sessionStorage.setItem('nx-login-from', volverA);
      } catch {
        /* Almacenamiento bloqueado: se volverá al destino por defecto según el papel. */
      }
    }
    location.href = `${this.config.apiBase}/oauth2/authorization/${proveedor}`;
  }

  /** Adónde quería ir quien fue desviado hasta aquí. Se comprueba que sea una ruta interna. */
  private destino(): string | null {
    const volverA = this.parametros.get('volverA');
    return volverA?.startsWith('/') && !volverA.startsWith('//') && volverA !== '/login'
      ? volverA
      : null;
  }

  private async cargaResumenDeAlmacenes(): Promise<void> {
    const resultado = await this.almacenes.consulta();
    if (resultado.ok) {
      this.resumen.set(resultado.valor);
    }
    // Si falla, el rótulo se queda en su versión genérica: un dato decorativo no puede romper el acceso.
  }
}
