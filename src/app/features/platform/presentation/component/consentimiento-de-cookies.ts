import { Component, effect, inject, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCookieBite } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PaisDelUsuario } from '@core/http/pais-del-usuario';
import { ConsentimientoDeCookiesStore } from '../../application/state/consentimiento-de-cookies.store';
import { DecideSobreCookies } from '../../application/use-case/decide-sobre-cookies.use-case';

/**
 * El aviso de cookies y su panel de ajuste.
 *
 * <p>Se enseña hasta que alguien decide. El texto se adapta al régimen del país —consentimiento previo
 * en Europa, Reino Unido y Brasil; oposición en California— pero lo que NO depende del régimen es qué
 * se enciende: antes de decidir, nada. La versión anterior encendía analítica y publicidad de entrada
 * en los regímenes de oposición, y bastaba una detección de país fallida —que es lo habitual, porque
 * un navegador en «es» a secas no da región— para cargarlas sin consentimiento a alguien en Europa.
 *
 * <p>Va montado en el marco de la aplicación para que aparezca en toda la web.
 *
 * <p>MOBILE FIRST: el aviso ocupa el ancho de la pantalla abajo del todo, con los botones envolviendo
 * en varias líneas si hace falta; el ancho máximo y el margen mayor solo llegan a partir de `sm`.
 */
@Component({
  selector: 'nx-consentimiento-de-cookies',
  imports: [RouterLink, FaIconComponent, FormField],
  template: `
    @if (estado.visible()) {
      @if (!estado.panelAbierto()) {
        <div class="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4">
          <div
            role="region"
            [attr.aria-label]="t('cookies.title')"
            class="mx-auto max-w-4xl card p-4 sm:p-5 shadow-lg border border-ink-100 bg-base-100"
          >
            <div class="flex items-start gap-3">
              <fa-icon [icon]="iconoGalleta" class="text-brand-600 text-lg mt-0.5" />
              <div class="flex-1">
                <p class="text-[13px] text-ink-600 leading-relaxed">
                  {{ t(estado.claveDelTexto()) }}
                  <a routerLink="/legal/cookies" class="link link-primary">
                    {{ t('cookies.policy_link') }}</a
                  >.
                </p>
                <div class="flex flex-wrap gap-2 mt-3">
                  <button type="button" class="btn btn-primary btn-sm" (click)="decide.aceptaTodo()">
                    {{ t('cookies.accept_all') }}
                  </button>
                  <button type="button" class="btn btn-outline btn-sm" (click)="decide.rechazaTodo()">
                    {{ t('cookies.reject_all') }}
                  </button>
                  <button type="button" class="btn btn-ghost btn-sm" (click)="personaliza()">
                    {{ t('cookies.customize') }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      } @else {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          (click)="estado.cierraPanel()"
          (keydown.escape)="estado.cierraPanel()"
          tabindex="-1"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="nx-cookies-titulo"
            class="card p-6 w-full sm:max-w-lg bg-base-100"
            (click)="$event.stopPropagation()"
            (keydown.escape)="estado.cierraPanel()"
          >
            <h2 id="nx-cookies-titulo" class="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <fa-icon [icon]="iconoGalleta" class="text-brand-600" />
              {{ t('cookies.title') }}
            </h2>
            <p class="text-[13px] text-ink-500 mt-1">{{ t(estado.claveDelTexto()) }}</p>

            <div class="mt-4 space-y-3">
              <div class="flex items-start justify-between gap-3 rounded-box border border-ink-100 p-3">
                <div>
                  <div class="text-[13px] font-medium text-slate-800">{{ t('cookies.necessary') }}</div>
                  <div class="text-[12px] text-ink-500 mt-0.5 leading-relaxed">
                    {{ t('cookies.necessary_desc') }}
                  </div>
                </div>
                <!-- Las necesarias no se preguntan: sin ellas no hay sesión ni cesta. -->
                <span class="text-[11px] text-emerald-600 font-medium whitespace-nowrap mt-1">
                  {{ t('cookies.always_on') }}
                </span>
              </div>

              <div class="flex items-start justify-between gap-3 rounded-box border border-ink-100 p-3">
                <div>
                  <label for="nx-cookies-analitica" class="text-[13px] font-medium text-slate-800">
                    {{ t('cookies.analytics') }}
                  </label>
                  <div class="text-[12px] text-ink-500 mt-0.5 leading-relaxed">
                    {{ t('cookies.analytics_desc') }}
                  </div>
                </div>
                <input
                  id="nx-cookies-analitica"
                  type="checkbox"
                  class="toggle toggle-primary toggle-sm mt-1"
                  [formField]="formulario.analitica"
                />
              </div>

              <div class="flex items-start justify-between gap-3 rounded-box border border-ink-100 p-3">
                <div>
                  <label for="nx-cookies-publicidad" class="text-[13px] font-medium text-slate-800">
                    {{ t('cookies.marketing') }}
                  </label>
                  <div class="text-[12px] text-ink-500 mt-0.5 leading-relaxed">
                    {{ t('cookies.marketing_desc') }}
                  </div>
                </div>
                <input
                  id="nx-cookies-publicidad"
                  type="checkbox"
                  class="toggle toggle-primary toggle-sm mt-1"
                  [formField]="formulario.publicidad"
                />
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2 mt-5">
              <button type="button" class="btn btn-primary btn-sm" (click)="guarda()">
                {{ t('cookies.save') }}
              </button>
              <button type="button" class="btn btn-outline btn-sm" (click)="decide.aceptaTodo()">
                {{ t('cookies.accept_all') }}
              </button>
              <button type="button" class="btn btn-ghost btn-sm" (click)="decide.rechazaTodo()">
                {{ t('cookies.reject_all') }}
              </button>
              <a
                routerLink="/legal/cookies"
                class="link link-primary text-[12px] ml-auto"
                (click)="estado.cierraPanel()"
              >
                {{ t('cookies.policy_link') }}
              </a>
            </div>
          </div>
        </div>
      }
    }
  `,
})
export class ConsentimientoDeCookies {
  protected readonly estado = inject(ConsentimientoDeCookiesStore);
  protected readonly decide = inject(DecideSobreCookies);
  protected readonly t = inject(TraduccionService).t;

  private readonly pais = inject(PaisDelUsuario);

  protected readonly iconoGalleta = faCookieBite;

  /**
   * Lo que se está marcando en el panel, todavía sin guardar.
   *
   * <p>Sin reglas de validación: aquí no hay nada que exigir —cualquier combinación de las dos casillas
   * es una decisión válida, incluida ninguna—. Va por Signal Forms igual que el resto para que las dos
   * casillas tengan un único sitio del que salir y al que volver al abrir el panel.
   */
  protected readonly modelo = signal({ analitica: false, publicidad: false });
  protected readonly formulario = form(this.modelo);

  constructor() {
    // El régimen se recalcula si aparece el país del perfil: quien entra a mitad de visita nos dice
    // dónde está, y ese dato es más fiable que deducirlo del idioma del navegador.
    effect(() => {
      this.decide.arranca(this.pais.codigo());
    });
  }

  /**
   * Abrir el panel arranca SIEMPRE con las dos apagadas.
   *
   * <p>Es deliberado: quien pulsa «personalizar» está eligiendo, y encontrarse las casillas marcadas de
   * antemano convierte la elección en un descuido — que es la forma de consentimiento que la norma no
   * admite.
   */
  protected personaliza(): void {
    this.modelo.set({ analitica: false, publicidad: false });
    this.estado.abrePanel();
  }

  protected guarda(): void {
    const elegido = this.modelo();
    this.decide.guarda({ analitica: elegido.analitica, publicidad: elegido.publicidad });
  }
}
