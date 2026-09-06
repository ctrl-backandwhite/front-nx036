import { Component, computed, inject, input, model, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCookieBite } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';

/**
 * El régimen de privacidad que aplica a quien mira. QUÉ país cae en cuál es una decisión legal y vive
 * fuera del sistema de diseño; aquí solo se traduce a la frase que toca enseñar.
 */
export type RegimenCookies = 'gdpr' | 'uk' | 'lgpd' | 'ccpa' | 'default';

/** Qué se ha decidido para las categorías que se pueden rechazar. */
export interface DecisionCookies {
  readonly analiticas: boolean;
  readonly marketing: boolean;
}

/** Los regímenes que exigen consentimiento PREVIO: hasta que se acepta, nada no esencial se activa. */
const EXIGEN_ACEPTAR: readonly RegimenCookies[] = ['gdpr', 'uk', 'lgpd'];

/**
 * El aviso de cookies: franja abajo y ventana de ajuste fino.
 *
 * <p>El texto se adapta al régimen del país —consentimiento previo frente al modelo de oposición—
 * porque prometer lo que no aplica es tan incorrecto como callarse lo que sí.
 *
 * <p>Lo que aquí NO se hace: decidir el régimen, guardar la decisión ni activar nada. Se pinta y se
 * avisa; qué país cae en qué régimen y dónde se apunta lo elegido es asunto de quien lo monta.
 */
@Component({
  selector: 'nx-consentimiento-cookies',
  imports: [RouterLink, FaIconComponent],
  template: `
    @if (!decidido() || abierto()) {
      @if (!abierto()) {
        <div class="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4">
          <div
            class="mx-auto max-w-4xl card p-4 sm:p-5 shadow-lg border border-ink-100 bg-base-100"
          >
            <div class="flex items-start gap-3">
              <fa-icon [icon]="iconoGalleta" class="text-brand-600 text-lg mt-0.5" />
              <div class="flex-1">
                <p class="text-[13px] text-ink-600 leading-relaxed">
                  {{ texto() }}
                  <a routerLink="/legal/cookies" class="link link-primary">
                    {{ t('cookies.policy_link') }}</a
                  >.
                </p>
                <div class="flex flex-wrap gap-2 mt-3">
                  <button type="button" (click)="aceptaTodo.emit()" class="btn btn-primary btn-sm">
                    {{ t('cookies.accept_all') }}
                  </button>
                  <button type="button" (click)="rechazaTodo.emit()" class="btn btn-outline btn-sm">
                    {{ t('cookies.reject_all') }}
                  </button>
                  <button type="button" (click)="personaliza()" class="btn btn-ghost btn-sm">
                    {{ t('cookies.customize') }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      } @else {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <!-- El fondo, en su propia capa decorativa: el clic que cierra no puede colgar del contenedor
               que envuelve la ventana, porque entonces cerraría también al pulsar dentro. -->
          <div class="absolute inset-0" (click)="abierto.set(false)" aria-hidden="true"></div>
          <div
            class="card relative p-6 max-w-lg w-full bg-base-100"
            role="dialog"
            aria-modal="true"
            [attr.aria-label]="t('cookies.title')"
          >
            <h3 class="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <fa-icon [icon]="iconoGalleta" class="text-brand-600" /> {{ t('cookies.title') }}
            </h3>
            <p class="text-[13px] text-ink-500 mt-1">{{ texto() }}</p>

            <div class="mt-4 space-y-3">
              <div class="flex items-start justify-between gap-3 rounded-box border border-ink-100 p-3">
                <div>
                  <div class="text-[13px] font-medium text-slate-800">
                    {{ t('cookies.necessary') }}
                  </div>
                  <div class="text-[12px] text-ink-500 mt-0.5 leading-relaxed">
                    {{ t('cookies.necessary_desc') }}
                  </div>
                </div>
                <!-- Las necesarias no se pueden apagar y por eso NO se pintan como un interruptor: un
                     mando que no obedece hace pensar que la decisión no se guardó. -->
                <span class="text-[11px] text-emerald-600 font-medium whitespace-nowrap mt-1">
                  {{ t('cookies.always_on') }}
                </span>
              </div>

              <div class="flex items-start justify-between gap-3 rounded-box border border-ink-100 p-3">
                <div>
                  <div class="text-[13px] font-medium text-slate-800">
                    {{ t('cookies.analytics') }}
                  </div>
                  <div class="text-[12px] text-ink-500 mt-0.5 leading-relaxed">
                    {{ t('cookies.analytics_desc') }}
                  </div>
                </div>
                <input
                  type="checkbox"
                  class="toggle toggle-primary toggle-sm mt-1"
                  [attr.aria-label]="t('cookies.analytics')"
                  [checked]="analiticas()"
                  (change)="analiticas.set(marcado($event))"
                />
              </div>

              <div class="flex items-start justify-between gap-3 rounded-box border border-ink-100 p-3">
                <div>
                  <div class="text-[13px] font-medium text-slate-800">
                    {{ t('cookies.marketing') }}
                  </div>
                  <div class="text-[12px] text-ink-500 mt-0.5 leading-relaxed">
                    {{ t('cookies.marketing_desc') }}
                  </div>
                </div>
                <input
                  type="checkbox"
                  class="toggle toggle-primary toggle-sm mt-1"
                  [attr.aria-label]="t('cookies.marketing')"
                  [checked]="marketing()"
                  (change)="marketing.set(marcado($event))"
                />
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2 mt-5">
              <button type="button" (click)="confirma()" class="btn btn-primary btn-sm">
                {{ t('cookies.save') }}
              </button>
              <button type="button" (click)="aceptaTodo.emit()" class="btn btn-outline btn-sm">
                {{ t('cookies.accept_all') }}
              </button>
              <button type="button" (click)="rechazaTodo.emit()" class="btn btn-ghost btn-sm">
                {{ t('cookies.reject_all') }}
              </button>
              <a
                routerLink="/legal/cookies"
                (click)="abierto.set(false)"
                class="link link-primary text-[12px] ml-auto"
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
export class ConsentimientoCookies {
  /** Cierto cuando ya se ha decidido: entonces solo se ve si se abre la ventana a propósito. */
  readonly decidido = input(false);
  readonly regimen = input<RegimenCookies>('default');
  /** La ventana de ajuste fino. Es un modelo para poder reabrirla desde el pie. */
  readonly abierto = model(false);

  readonly aceptaTodo = output<void>();
  readonly rechazaTodo = output<void>();
  readonly guarda = output<DecisionCookies>();

  protected readonly iconoGalleta = faCookieBite;
  protected readonly t = inject(TraduccionService).t;

  protected readonly analiticas = signal(false);
  protected readonly marketing = signal(false);

  protected readonly texto = computed(() => {
    const regimen = this.regimen();
    if (regimen === 'ccpa') {
      return this.t('cookies.banner.ccpa');
    }
    return EXIGEN_ACEPTAR.includes(regimen)
      ? this.t('cookies.banner.optin')
      : this.t('cookies.banner.default');
  });

  protected marcado(evento: Event): boolean {
    return (evento.target as HTMLInputElement).checked;
  }

  /** Personalizar arranca en «nada aceptado»: el consentimiento se da, no se retira. */
  protected personaliza(): void {
    this.analiticas.set(false);
    this.marketing.set(false);
    this.abierto.set(true);
  }

  protected confirma(): void {
    this.guarda.emit({ analiticas: this.analiticas(), marketing: this.marketing() });
  }
}
