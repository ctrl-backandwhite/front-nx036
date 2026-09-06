import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faGithub, faGoogle } from '@fortawesome/free-brands-svg-icons';
import {
  faArrowLeft,
  faCircleNodes,
  faTriangleExclamation,
  faUserPlus,
} from '@fortawesome/free-solid-svg-icons';
import { FormField, email as validaEmail, form, required } from '@angular/forms/signals';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PreferenciasService } from '@core/preferences/preferencias';
import { APP_CONFIG } from '@core/config/app-config';
import { LOCALE_OPTIONS } from '@shared/i18n/translations';
import { LEGAL_UPDATED } from '@shared/content/legal-pages';
import { Captcha } from '@ds/component/captcha/captcha';
import { RequisitosContrasena } from '@ds/component/contrasena/requisitos-contrasena';
import { contrasenaValida } from '@shared/validation/politica-contrasena';
import { CreaCuenta } from '../../application/use-case/crea-cuenta.use-case';
import { DESTINO_TRAS_ACCESO_PORT } from '../../domain/port/destino-tras-acceso.port';
import {
  DIVISAS_ACTIVAS_PORT,
  GEOLOCALIZACION_PORT,
  PAISES_DE_ENVIO_PORT,
  PaisDeEnvio,
} from '../../domain/port/datos-del-alta.port';
import { PanelDeAlta } from '../component/panel-de-alta';

/** Lo que se tarda en saltar a la activación: lo justo para leer el aviso sin quedarse esperando. */
const ESPERA_ANTES_DE_ACTIVAR_MS = 2500;

/**
 * El alta.
 *
 * <p>Tres decisiones que NO son de estilo y viajan del front anterior:
 * <ul>
 *   <li>La aceptación de las condiciones es EXPLÍCITA y guarda qué versión se aceptó. «Al crear una
 *       cuenta aceptas estas condiciones» valía como aceptación, pero no dejaba constancia de qué
 *       aceptó cada persona ni cuándo, que es justo lo que hay que poder acreditar si se discute.</li>
 *   <li>El consentimiento comercial va en una casilla APARTE y sin marcar. Empaquetarlo con el alta no
 *       es consentimiento, y una casilla premarcada tampoco.</li>
 *   <li>El alta social exige lo mismo: si se pulsa Google o GitHub sin aceptar las condiciones no se
 *       salta, se avisa. El consentimiento legal no depende de por dónde se entre.</li>
 * </ul>
 *
 * <p>MOBILE FIRST: una sola columna con el formulario; el panel de marca aparece a partir de `lg` y los
 * campos se emparejan a partir de `sm`.
 */
@Component({
  selector: 'nx-alta',
  imports: [RouterLink, FaIconComponent, FormField, PanelDeAlta, Captcha, RequisitosContrasena],
  template: `
    <div class="min-h-screen grid lg:grid-cols-2 bg-base-100">
      <nx-panel-de-alta
        [cuantosPaises]="paises().length"
        [cuantasDivisas]="cuantasDivisas()"
        [cuantosIdiomas]="idiomas.length"
      />

      <div class="flex items-center justify-center px-4 py-10 lg:px-12 bg-base-100">
        <div class="card w-full max-w-lg bg-base-100 shadow-xl border border-base-200">
          <a routerLink="/" class="flex lg:hidden items-center justify-center gap-2 mt-4 font-bold text-lg">
            <fa-icon [icon]="iconos.marca" class="text-primary" />
            NX036
          </a>
          <div class="card-body">
            <!-- Pantalla suelta, sin la cabecera de la tienda: sin este enlace no hay forma de volver. -->
            <a routerLink="/" class="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mb-1 self-start">
              <fa-icon [icon]="iconos.atras" class="text-[12px]" />
              {{ t('common.back_to_store') }}
            </a>
            <h1 class="text-2xl font-semibold">{{ t('register.title') }}</h1>
            <p class="text-sm opacity-70 mt-1">{{ t('register.subtitle') }}</p>

            <div class="mt-5">
              <div class="grid grid-cols-2 gap-2">
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
              @if (avisoDeSocial()) {
                <div role="alert" class="alert alert-warning py-2 text-[13px] mt-2">
                  <fa-icon [icon]="iconos.aviso" />
                  <span>{{ t('register.social_locked') }}</span>
                </div>
              }
              <div class="divider text-[11px] uppercase tracking-wider opacity-60 my-4">{{ t('login.or_email') }}</div>
            </div>

            @if (error(); as mensaje) {
              <div role="alert" class="alert alert-error mt-5 py-2 text-sm"><span>{{ mensaje }}</span></div>
            }
            @if (hecho(); as mensaje) {
              <!-- El verde por defecto se quedaba corto de contraste: borde marcado y texto explícito. -->
              <div role="alert"
                   class="alert alert-success mt-5 py-2 text-sm border-l-4 border-success !text-success-content font-medium">
                <fa-icon [icon]="iconos.marca" class="opacity-70" />
                <span>{{ mensaje }}</span>
              </div>
            }

            <!--
              Cada campo con su etiqueta asociada. Sin ella, un lector de pantalla anuncia los nueve
              campos como «cuadro de edición» sin decir cuál: en un alta así es directamente no poder
              registrarse.
            -->
            <form (submit)="envia($event)" class="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="sm:col-span-2">
                <label for="alta-email" class="text-sm opacity-80 mb-1 block">{{ t('login.email') }} *</label>
                <input id="alta-email" type="email" autocomplete="email" class="input input-bordered w-full"
                       [formField]="formulario.email" />
              </div>

              <div>
                <label for="alta-clave" class="text-sm opacity-80 mb-1 block">{{ t('login.password') }} *</label>
                <input id="alta-clave" type="password" autocomplete="new-password"
                       class="input input-bordered w-full" [formField]="formulario.contrasena" />
              </div>
              <div>
                <label for="alta-repite" class="text-sm opacity-80 mb-1 block">{{ t('register.repeat_password') }} *</label>
                <input id="alta-repite" type="password" autocomplete="new-password"
                       class="input input-bordered w-full" [formField]="formulario.repiteContrasena" />
                @if (noCoinciden()) {
                  <span role="alert" class="text-xs text-error mt-1 block">{{ t('profile.passwords_mismatch') }}</span>
                }
              </div>

              <div>
                <label for="alta-nombre" class="text-sm opacity-80 mb-1 block">{{ t('profile.first_name') }}</label>
                <input id="alta-nombre" class="input input-bordered w-full" [formField]="formulario.nombre" />
              </div>
              <div>
                <label for="alta-apellido1" class="text-sm opacity-80 mb-1 block">{{ t('register.last_name1') }}</label>
                <input id="alta-apellido1" class="input input-bordered w-full" [formField]="formulario.primerApellido" />
              </div>
              <div>
                <label for="alta-apellido2" class="text-sm opacity-80 mb-1 block">{{ t('register.last_name2') }}</label>
                <input id="alta-apellido2" class="input input-bordered w-full" [formField]="formulario.segundoApellido" />
              </div>
              <div>
                <label for="alta-empresa" class="text-sm opacity-80 mb-1 block">{{ t('profile.company') }}</label>
                <input id="alta-empresa" class="input input-bordered w-full" [formField]="formulario.empresa" />
              </div>

              <div>
                <label for="alta-pais" class="text-sm opacity-70 mb-1 block">{{ t('register.country') }}</label>
                <select id="alta-pais" class="select select-bordered w-full" [formField]="formulario.pais"
                        (change)="paisElegidoAMano.set(true)">
                  <option value="">—</option>
                  @for (pais of paises(); track pais.codigo) {
                    <option [value]="pais.codigo">{{ pais.nombre }}</option>
                  }
                </select>
              </div>
              <div>
                <label for="alta-idioma" class="text-sm opacity-70 mb-1 block">{{ t('register.language') }}</label>
                <select id="alta-idioma" class="select select-bordered w-full" [formField]="formulario.idioma">
                  @for (idioma of idiomas; track idioma.code) {
                    <option [value]="idioma.code">{{ idioma.flag }} {{ idioma.label }}</option>
                  }
                </select>
              </div>

              <div class="sm:col-span-2">
                <nx-requisitos-contrasena [contrasena]="modelo().contrasena" />
              </div>

              <div class="sm:col-span-2 mt-1 space-y-2">
                <label class="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" class="checkbox checkbox-sm checkbox-primary mt-0.5"
                         [checked]="aceptaCondiciones()" (change)="cambiaCondiciones($event)" />
                  <span class="text-[13px] opacity-80 leading-relaxed">
                    {{ t('register.accept_terms_pre') }}
                    <a routerLink="/legal/terms" target="_blank" class="link link-primary">{{ t('footer.link.terms') }}</a>
                    {{ t('register.accept_terms_and') }}
                    <a routerLink="/legal/privacy" target="_blank" class="link link-primary">{{ t('footer.link.privacy') }}</a>.
                  </span>
                </label>
                <label class="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" class="checkbox checkbox-sm mt-0.5"
                         [checked]="aceptaComunicaciones()"
                         (change)="aceptaComunicaciones.set(marcado($event))" />
                  <span class="text-[13px] opacity-70 leading-relaxed">{{ t('register.accept_marketing') }}</span>
                </label>
              </div>

              <!-- Reto visible: se resuelve solo y sin él no se crea la cuenta. -->
              <div class="sm:col-span-2 mt-1">
                <nx-captcha (testigo)="captcha.set($event)" />
              </div>

              <div class="sm:col-span-2 mt-2">
                <button type="submit" class="btn btn-primary w-full"
                        [disabled]="enviando() || !aceptaCondiciones() || !captcha()">
                  @if (enviando()) {
                    <span class="loading loading-spinner loading-sm"></span> {{ t('register.creating') }}
                  } @else {
                    <fa-icon [icon]="iconos.alta" /> {{ t('register.submit') }}
                  }
                </button>
              </div>
            </form>

            <div class="mt-6 text-center text-sm opacity-70">
              {{ t('register.have_account') }}
              <a routerLink="/login" class="link link-primary font-medium">{{ t('login.title') }}</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AltaPage {
  private readonly traduccion = inject(TraduccionService);
  private readonly preferencias = inject(PreferenciasService);
  private readonly creaCuenta = inject(CreaCuenta);
  private readonly paisesDeEnvio = inject(PAISES_DE_ENVIO_PORT);
  private readonly divisas = inject(DIVISAS_ACTIVAS_PORT);
  private readonly geo = inject(GEOLOCALIZACION_PORT);
  private readonly destinoTrasAcceso = inject(DESTINO_TRAS_ACCESO_PORT);
  private readonly config = inject(APP_CONFIG);
  private readonly router = inject(Router);

  protected readonly t = this.traduccion.t;
  protected readonly idiomas = LOCALE_OPTIONS;

  /** El idioma de partida es el que se está usando, no un «en» escrito a fuego. */
  protected readonly modelo = signal({
    email: '',
    contrasena: '',
    repiteContrasena: '',
    nombre: '',
    primerApellido: '',
    segundoApellido: '',
    empresa: '',
    pais: '',
    idioma: String(this.preferencias.idioma()),
  });

  protected readonly formulario = form(this.modelo, (ruta) => {
    required(ruta.email);
    validaEmail(ruta.email);
    required(ruta.contrasena);
    required(ruta.repiteContrasena);
  });

  protected readonly aceptaCondiciones = signal(false);
  protected readonly aceptaComunicaciones = signal(false);
  protected readonly captcha = signal<string | null>(null);
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly hecho = signal<string | null>(null);
  protected readonly avisoDeSocial = signal(false);

  /** Si se elige país a mano, la detección automática ya no lo pisa. */
  protected readonly paisElegidoAMano = signal(false);
  protected readonly paises = signal<readonly PaisDeEnvio[]>([]);
  protected readonly cuantasDivisas = signal(0);

  protected readonly noCoinciden = computed(() => {
    const { contrasena, repiteContrasena } = this.modelo();
    return repiteContrasena.length > 0 && contrasena !== repiteContrasena;
  });

  protected readonly iconos = {
    marca: faCircleNodes,
    atras: faArrowLeft,
    aviso: faTriangleExclamation,
    alta: faUserPlus,
    google: faGoogle,
    github: faGithub,
  };

  private salto: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    void this.cargaDatosDeApoyo();
    // El salto a la activación es diferido. Si quien se registra se va antes, el temporizador seguía
    // vivo y la arrastraba a la activación desde otra pantalla: se cancela al desmontar.
    inject(DestroyRef).onDestroy(() => {
      if (this.salto) {
        clearTimeout(this.salto);
      }
    });
  }

  protected marcado(evento: Event): boolean {
    return (evento.target as HTMLInputElement).checked;
  }

  protected cambiaCondiciones(evento: Event): void {
    const marcado = this.marcado(evento);
    this.aceptaCondiciones.set(marcado);
    if (marcado) {
      this.avisoDeSocial.set(false);
    }
  }

  /**
   * El alta social salta al proveedor. Los botones están siempre activos, pero sin condiciones
   * aceptadas no se salta: el consentimiento legal es el mismo que para el alta por correo.
   */
  protected entraCon(proveedor: 'google' | 'github'): void {
    if (!this.aceptaCondiciones()) {
      this.avisoDeSocial.set(true);
      return;
    }
    this.destinoTrasAcceso.recuerda('/');
    location.href = `${this.config.apiBase}/oauth2/authorization/${proveedor}`;
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
      const resultado = await this.creaCuenta.ejecuta(
        {
          ...datos,
          aceptaCondiciones: this.aceptaCondiciones(),
          versionDeCondiciones: LEGAL_UPDATED,
          aceptaComunicaciones: this.aceptaComunicaciones(),
        },
        contrasenaValida(datos.contrasena),
        this.captcha(),
      );

      if (resultado.ok) {
        // El texto se toma del diccionario local: si el backend contesta en otro idioma, se descarta.
        const propio = this.t('register.success');
        this.hecho.set(propio !== 'register.success' ? propio : resultado.valor.mensaje);
        this.salto = setTimeout(
          () => void this.router.navigateByUrl('/activate'),
          ESPERA_ANTES_DE_ACTIVAR_MS,
        );
        return;
      }
      this.error.set(this.mensajeDelFallo(resultado.error.codigo, resultado.error.mensaje));
    } finally {
      this.enviando.set(false);
    }
  }

  /**
   * Qué se enseña cuando no sale. Los códigos locales tienen su texto; los del servidor llegan ya
   * traducidos por él y se pintan tal cual.
   */
  private mensajeDelFallo(codigo: string | undefined, mensaje: string): string {
    const propios: Record<string, string> = {
      'contrasenas-no-coinciden': 'profile.passwords_mismatch',
      'contrasena-debil': 'register.error.weak_password',
      'condiciones-sin-aceptar': 'register.social_locked',
      'captcha-pendiente': 'captcha.error',
    };
    const clave = codigo ? propios[codigo] : undefined;
    return clave ? this.t(clave) : mensaje || this.t('register.error.generic');
  }

  /**
   * Países, divisas y país del visitante. Si algo falla se sigue: el desplegable se queda vacío o el
   * rótulo sin cifra, pero el alta se puede completar igual.
   */
  private async cargaDatosDeApoyo(): Promise<void> {
    const [paises, divisas] = await Promise.all([
      this.paisesDeEnvio.consulta(),
      this.divisas.cuantas(),
    ]);
    if (paises.ok) {
      this.paises.set(paises.valor);
    }
    if (divisas.ok) {
      this.cuantasDivisas.set(divisas.valor);
    }

    // Se preselecciona el país detectado SOLO si está dentro de la cobertura de envío y nadie lo ha
    // tocado: proponer un destino al que no se despacha sería peor que no proponer ninguno.
    const geo = await this.geo.paisDelVisitante();
    if (!geo.ok || !geo.valor || this.paisElegidoAMano() || this.modelo().pais) {
      return;
    }
    if (this.paises().some((p) => p.codigo === geo.valor)) {
      this.modelo.update((m) => ({ ...m, pais: geo.valor as string }));
    }
  }
}
