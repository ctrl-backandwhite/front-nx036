import { Component, computed, inject, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPaypal } from '@fortawesome/free-brands-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AnadePaypal } from '../../application/use-case/cobros.use-case';

/**
 * Guardar una cuenta de PayPal como método de pago.
 *
 * <p>El correo se cifra en el servidor y de vuelta solo llega enmascarado, así que aquí no se guarda
 * nada: se escribe, se manda y se olvida.
 *
 * <p>Mobile first: campo y botón apilados, y en una fila a partir de `sm`.
 */
@Component({
  selector: 'nx-alta-de-paypal',
  imports: [FaIconComponent],
  template: `
    <div class="mt-4 pt-4 border-t border-ink-100">
      <label for="alta-paypal-correo" class="text-sm font-semibold text-ink-700 flex items-center gap-1.5 mb-1">
        <fa-icon [icon]="iconoPaypal" class="text-[#003087]" /> {{ t('profile.billing.add_paypal') }}
      </label>
      <div class="flex flex-col gap-2 mt-1 sm:flex-row">
        <input
          id="alta-paypal-correo"
          type="email"
          autocomplete="email"
          class="input input-bordered input-sm flex-1"
          [placeholder]="t('profile.billing.paypal_email')"
          [value]="correo()"
          (input)="escribe($event)"
        />
        <button
          type="button"
          class="btn btn-outline btn-sm text-[12px] whitespace-nowrap"
          [disabled]="guardando() || !hayCorreo()"
          (click)="guarda()"
        >
          <fa-icon [icon]="iconoPaypal" />
          {{ guardando() ? t('profile.billing.saving') : t('profile.billing.save_paypal') }}
        </button>
      </div>
      @if (error(); as mensaje) {
        <p role="alert" class="text-error text-[12px] mt-1">{{ mensaje }}</p>
      }
    </div>
  `,
})
export class AltaDePaypal {
  readonly anadida = output<void>();

  private readonly traduccion = inject(TraduccionService);
  private readonly anade = inject(AnadePaypal);

  protected readonly t = this.traduccion.t;
  protected readonly iconoPaypal = faPaypal;

  protected readonly correo = signal('');
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly hayCorreo = computed(() => this.correo().trim() !== '');

  protected escribe(evento: Event): void {
    this.correo.set((evento.target as HTMLInputElement).value);
  }

  protected async guarda(): Promise<void> {
    if (!this.hayCorreo() || this.guardando()) {
      return;
    }
    this.guardando.set(true);
    this.error.set(null);
    try {
      const resultado = await this.anade.ejecuta(this.correo());
      if (resultado.ok) {
        this.correo.set('');
        this.anadida.emit();
        return;
      }
      this.error.set(resultado.error.mensaje || this.t('profile.billing.error'));
    } finally {
      this.guardando.set(false);
    }
  }
}
