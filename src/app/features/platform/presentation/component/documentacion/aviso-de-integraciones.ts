import { Component, inject, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPlug } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';

/**
 * El aviso de disponibilidad de las integraciones, al abrir la documentación.
 *
 * <p>Lo monta la pantalla SOLO cuando ya está en el navegador. En el front de React esto era un portal
 * a `document.body` y, al no haber `document` al renderizar en servidor, la condición no cortocircuitaba
 * y la página entera reventaba. Aquí no hay portal —el aviso está fijo sobre todo lo demás con
 * posicionamiento— pero la razón de esperar sigue en pie: es un mensaje que solo tiene sentido para
 * quien está mirando, y no debe formar parte del HTML que se escribe al construir.
 */
@Component({
  selector: 'nx-aviso-de-integraciones',
  imports: [FaIconComponent],
  template: `
    <div
      class="fixed inset-0 z-[100] flex items-center justify-center p-4"
      (click)="cierra.emit()"
      (keydown.escape)="cierra.emit()"
      tabindex="-1"
    >
      <div class="absolute inset-0 bg-black/40"></div>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="nx-aviso-dev-titulo"
        class="relative bg-base-100 rounded-box shadow-xl w-full sm:max-w-lg border border-base-200 overflow-hidden"
        (click)="$event.stopPropagation()"
        (keydown.escape)="cierra.emit()"
      >
        <div class="bg-gradient-to-br from-primary/15 to-accent/15 px-6 pt-6 pb-4 text-center">
          <span
            class="inline-flex w-12 h-12 items-center justify-center rounded-full bg-primary/15 text-primary mb-2"
          >
            <fa-icon [icon]="iconoEnchufe" class="text-lg" />
          </span>
          <h2 id="nx-aviso-dev-titulo" class="text-lg font-semibold text-slate-900">
            {{ t('dev.notice.title') }}
          </h2>
        </div>
        <div class="px-6 py-5 space-y-3 text-[14px] text-ink-600 leading-relaxed">
          <p>{{ t('dev.notice.body1') }}</p>
          <p>{{ t('dev.notice.body2') }}</p>
          <p class="text-[13px] text-ink-500">{{ t('dev.notice.signoff') }}</p>
        </div>
        <div class="px-6 pb-6 flex justify-center">
          <button type="button" class="btn btn-primary" (click)="cierra.emit()">
            {{ t('dev.notice.cta') }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class AvisoDeIntegraciones {
  readonly cierra = output<void>();

  protected readonly t = inject(TraduccionService).t;
  protected readonly iconoEnchufe = faPlug;
}
