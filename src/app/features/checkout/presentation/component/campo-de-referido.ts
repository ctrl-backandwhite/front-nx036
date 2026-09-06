import { Component, inject, input, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCircleCheck } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';

/**
 * El código de quien recomendó la compra.
 *
 * <p>NO altera el total: solo atribuye la venta. Va en su propio bloque, separado del desglose por una
 * línea, para que no se lea como un descuento — puesto junto a los importes, eso es justo lo que parece.
 *
 * <p>Si se llegó por un enlace ya sale aplicado y se dice de dónde viene; si no, se puede escribir aquí.
 */
@Component({
  selector: 'nx-campo-de-referido',
  imports: [FaIconComponent],
  template: `
    <div class="space-y-1.5 border-t border-ink-100 pt-3">
      <div class="text-xs font-medium opacity-70">{{ t('checkout.referral.label') }}</div>
      @if (aplicado()) {
        <div class="flex items-center gap-2 text-[13px] text-emerald-600">
          <fa-icon [icon]="iconoOk" />
          <span class="font-medium">{{ codigo() }}</span>
          <span class="opacity-70"
            >· {{ t(deEnlace() ? 'checkout.referral.from_link' : 'checkout.referral.applied') }}</span
          >
        </div>
      } @else {
        <div class="flex gap-2">
          <label class="sr-only" for="codigo-de-referido">{{ t('checkout.referral.label') }}</label>
          <input
            id="codigo-de-referido"
            class="input input-sm input-bordered flex-1 text-sm"
            [placeholder]="t('checkout.referral.placeholder')"
            [value]="escrito()"
            (input)="escribe($event)"
            (keydown.enter)="envia($event)"
          />
          <button
            type="button"
            class="btn btn-sm btn-outline"
            [disabled]="!escrito().trim() || ocupado()"
            (click)="aplica.emit(escrito().trim())"
          >
            {{ t('checkout.referral.apply') }}
          </button>
        </div>
        @if (invalido()) {
          <div role="alert" class="text-[12px] text-error">{{ t('checkout.referral.invalid') }}</div>
        }
      }
    </div>
  `,
})
export class CampoDeReferido {
  readonly codigo = input('');
  readonly aplicado = input(false);
  readonly deEnlace = input(false);
  readonly invalido = input(false);
  readonly ocupado = input(false);
  readonly aplica = output<string>();

  protected readonly t = inject(TraduccionService).t;
  protected readonly iconoOk = faCircleCheck;
  protected readonly escrito = signal('');

  constructor() {
    // El que venga del enlace se escribe solo en el campo, para poder verlo antes de aplicarlo.
    queueMicrotask(() => this.escrito.set(this.codigo()));
  }

  protected escribe(evento: Event): void {
    this.escrito.set((evento.target as HTMLInputElement).value);
  }

  /** Enter aplica, pero NO envía el formulario del pago: sería pagar sin haberlo pedido. */
  protected envia(evento: Event): void {
    evento.preventDefault();
    const codigo = this.escrito().trim();
    if (codigo && !this.ocupado()) {
      this.aplica.emit(codigo);
    }
  }
}
