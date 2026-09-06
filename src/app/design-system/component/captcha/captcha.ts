import { Component, afterNextRender, inject, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faCircleCheck,
  faRotateRight,
  faShieldHalved,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { CaptchaService } from '@core/security/captcha.service';
import { TraduccionService } from '@core/i18n/traduccion.service';

type Estado = 'resolviendo' | 'hecho' | 'error';

/**
 * El comprobante de que hay una persona detrás, sin puzzles.
 *
 * <p>Al montarse pide un reto al backend y lo resuelve en el navegador (protocolo ALTCHA, prueba de
 * trabajo). Enseña el progreso —«comprobando… → verificado»— y entrega el testigo por su salida, para
 * que el formulario lo mande en la cabecera. El coste está en el cálculo, no en molestar a quien
 * rellena el formulario.
 */
@Component({
  selector: 'nx-captcha',
  imports: [FaIconComponent],
  template: `
    <div
      class="flex items-center gap-2 rounded-lg border border-base-300 bg-base-200/40 px-3 py-2.5 text-sm"
    >
      @switch (estado()) {
        @case ('resolviendo') {
          <span class="loading loading-spinner loading-xs text-primary"></span>
          <span class="opacity-80">{{ t('captcha.verifying') }}</span>
        }
        @case ('hecho') {
          <fa-icon [icon]="iconoHecho" class="text-success" />
          <span class="opacity-90">{{ t('captcha.verified') }}</span>
        }
        @case ('error') {
          <fa-icon [icon]="iconoAviso" class="text-warning" />
          <span class="opacity-80 flex-1">{{ t('captcha.error') }}</span>
          <button type="button" (click)="resuelve()" class="btn btn-ghost btn-xs gap-1">
            <fa-icon [icon]="iconoReintentar" /> {{ t('captcha.retry') }}
          </button>
        }
      }
      <span
        class="ml-auto inline-flex items-center gap-1 text-[10px] uppercase tracking-wide opacity-40"
      >
        <fa-icon [icon]="iconoEscudo" /> Altcha
      </span>
    </div>
  `,
})
export class Captcha {
  /** El testigo resuelto, o nulo mientras no lo haya. */
  readonly testigo = output<string | null>();

  protected readonly iconoHecho = faCircleCheck;
  protected readonly iconoAviso = faTriangleExclamation;
  protected readonly iconoReintentar = faRotateRight;
  protected readonly iconoEscudo = faShieldHalved;
  protected readonly t = inject(TraduccionService).t;
  protected readonly estado = signal<Estado>('resolviendo');

  private readonly captcha = inject(CaptchaService);

  constructor() {
    // `afterNextRender` y no el constructor por DOS motivos: al prerenderizar no hay que gastar cómputo
    // en un reto que nadie va a enviar, y —sobre todo— quien monta el componente todavía no está
    // escuchando la salida mientras se construye, así que el primer aviso de «aún no hay testigo» se
    // perdería y el formulario podría darse por válido sin él.
    afterNextRender(() => this.resuelve());
  }

  protected resuelve(): void {
    this.estado.set('resolviendo');
    this.testigo.emit(null);
    this.captcha
      .resuelve()
      .then((valor) => {
        this.testigo.emit(valor);
        this.estado.set('hecho');
      })
      .catch(() => {
        // El fallo se enseña con un botón de reintentar en vez de dejarlo girando: un reto que no llega
        // deja el formulario bloqueado sin decir por qué.
        this.testigo.emit(null);
        this.estado.set('error');
      });
  }
}
