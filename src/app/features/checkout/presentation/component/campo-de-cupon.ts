import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormField, form, validate } from '@angular/forms/signals';
import { TraduccionService } from '@core/i18n/traduccion.service';

/**
 * El cupón.
 *
 * <p>El código se teclea libre y solo viaja al servidor al pulsar «aplicar»: validarlo en cada pulsación
 * dispararía una cotización por letra, y cada cotización es una llamada al transportista.
 *
 * <p>Se escribe en mayúsculas mientras se teclea porque así están dados de alta: sin ello, quien escribe
 * en minúsculas recibe un «cupón no válido» que no entiende.
 *
 * <p>El campo lo lleva Signal Forms. Aquí no se pinta mensaje bajo el campo a propósito: el cupón es
 * OPCIONAL, y acusar de «obligatorio» a quien entra y sale sin escribir nada sería mentir. Lo que sí se
 * gana es un único sitio que decide si hay algo aplicable —`formulario().invalid()`— en vez de repetir la
 * misma comprobación en el botón y en el atajo del teclado.
 */
@Component({
  selector: 'nx-campo-de-cupon',
  imports: [FormField],
  template: `
    <div class="flex gap-2">
      <label class="sr-only" for="codigo-de-cupon">{{ t('checkout.coupon.placeholder') }}</label>
      <input
        id="codigo-de-cupon"
        class="input input-bordered input-sm flex-1"
        [placeholder]="t('checkout.coupon.placeholder')"
        [formField]="formulario"
        (input)="aMayusculas($event)"
        (keydown.enter)="envia($event)"
      />
      <button type="button" class="btn btn-sm" [disabled]="!sePuedeAplicar()" (click)="aplica.emit(codigo())">
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

  /**
   * Un código en blanco no es un cupón, y los espacios no cuentan: se declara con `validate()` y no con
   * `required()` porque `required()` da por bueno un campo con solo espacios, y eso acabaría mandando a
   * cotizar una cadena vacía.
   */
  protected readonly formulario = form(this.escrito, (ruta) => {
    validate(ruta, ({ value }) => (value().trim() === '' ? { kind: 'required' } : null));
  });

  /** El código tal como va a viajar. Derivado, así que se calcula una vez y no en tres sitios. */
  protected readonly codigo = computed(() => this.escrito().trim());

  /** Ni vacío ni el mismo que ya está aplicado: volver a mandarlo es otra llamada al transportista. */
  protected readonly sePuedeAplicar = computed(
    () => !this.formulario().invalid() && this.codigo() !== this.aplicado(),
  );

  /**
   * Los cupones están dados de alta en mayúsculas y el servidor los compara tal cual, así que se
   * normaliza en el mismo gesto de teclear.
   *
   * <p>Se corrige el CONTROL y además el modelo, y en ese orden. La directiva del formulario y este
   * escuchador atienden el mismo evento, y no hay garantía de cuál va primero: tocando solo el modelo,
   * la directiva podía leer después el valor crudo del control y deshacer la conversión —fue justo lo
   * que pasó—.
   */
  protected aMayusculas(evento: Event): void {
    const control = evento.target as HTMLInputElement;
    const mayusculas = control.value.toUpperCase();
    if (control.value !== mayusculas) {
      control.value = mayusculas;
    }
    if (this.escrito() !== mayusculas) {
      this.escrito.set(mayusculas);
    }
  }

  /** Enter aplica el cupón, pero NO envía el formulario: sería pagar sin haberlo pedido. */
  protected envia(evento: Event): void {
    evento.preventDefault();
    if (this.sePuedeAplicar()) {
      this.aplica.emit(this.codigo());
    }
  }
}
