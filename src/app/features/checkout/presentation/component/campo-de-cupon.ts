import { Component, inject, input, output, signal } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';

/**
 * El cupón.
 *
 * <p>El código se teclea libre y solo viaja al servidor al pulsar «aplicar»: validarlo en cada pulsación
 * dispararía una cotización por letra, y cada cotización es una llamada al transportista.
 *
 * <p>Se escribe en mayúsculas mientras se teclea porque así están dados de alta: sin ello, quien escribe
 * en minúsculas recibe un «cupón no válido» que no entiende.
 */
@Component({
  selector: 'nx-campo-de-cupon',
  template: `
    <div class="flex gap-2">
      <label class="sr-only" for="codigo-de-cupon">{{ t('checkout.coupon.placeholder') }}</label>
      <input
        id="codigo-de-cupon"
        class="input input-bordered input-sm flex-1"
        [placeholder]="t('checkout.coupon.placeholder')"
        [value]="escrito()"
        (input)="escribe($event)"
        (keydown.enter)="envia($event)"
      />
      <button
        type="button"
        class="btn btn-sm"
        [disabled]="!escrito().trim() || escrito().trim() === aplicado()"
        (click)="aplica.emit(escrito().trim())"
      >
        {{ t('checkout.coupon.apply') }}
      </button>
    </div>
    @if (error()) {
      <p role="alert" class="text-xs text-rose-600">{{ error() }}</p>
    }
    @if (aceptado()) {
      <p class="text-xs text-emerald-600">
        {{ tCon('checkout.coupon.ok', { code: aceptado() ?? '' }) }}
      </p>
    }
  `,
})
export class CampoDeCupon {
  /** El código que ya se mandó a cotizar. */
  readonly aplicado = input('');
  /** El que el servidor ha aceptado, tal como lo devuelve. */
  readonly aceptado = input<string | undefined>(undefined);
  readonly error = input<string | undefined>(undefined);
  readonly aplica = output<string>();

  private readonly traduccion = inject(TraduccionService);
  protected readonly t = this.traduccion.t;
  protected readonly tCon = this.traduccion.tCon;

  protected readonly escrito = signal('');

  protected escribe(evento: Event): void {
    this.escrito.set((evento.target as HTMLInputElement).value.toUpperCase());
  }

  /** Enter aplica el cupón, pero NO envía el formulario: sería pagar sin haberlo pedido. */
  protected envia(evento: Event): void {
    evento.preventDefault();
    const codigo = this.escrito().trim();
    if (codigo && codigo !== this.aplicado()) {
      this.aplica.emit(codigo);
    }
  }
}
