import { Component, computed, inject, output, signal } from '@angular/core';
import { FieldTree, FormField, email as validaCorreo, form, validate } from '@angular/forms/signals';
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
 * <p>El campo lo lleva Signal Forms: un único sitio —`formulario().invalid()`— decide si hay algo que
 * mandar, en vez de repetir la misma comprobación en el botón y dentro del método que guarda.
 *
 * <p>Mobile first: campo y botón apilados, y en una fila a partir de `sm`.
 */
@Component({
  selector: 'nx-alta-de-paypal',
  imports: [FaIconComponent, FormField],
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
          [formField]="formulario.correo"
        />
        <button
          type="button"
          class="btn btn-outline btn-sm text-[12px] whitespace-nowrap"
          [disabled]="guardando() || formulario().invalid()"
          (click)="guarda()"
        >
          <fa-icon [icon]="iconoPaypal" />
          {{ guardando() ? t('profile.billing.saving') : t('profile.billing.save_paypal') }}
        </button>
      </div>
      @if (falloDe(formulario.correo); as fallo) {
        <p role="alert" class="text-error text-[12px] mt-1">{{ fallo }}</p>
      }
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

  protected readonly modelo = signal({ correo: '' });

  /**
   * Un correo en blanco no es un correo, y los espacios no cuentan: por eso el hueco se declara con
   * `validate()` y no con `required()`, que da por bueno un campo con solo espacios y acabaría mandando
   * al servidor una cadena vacía a la que responder que no vale.
   *
   * <p>El mensaje va como FUNCIÓN para que se rehaga al cambiar de idioma sin volver a montar el campo.
   */
  protected readonly formulario = form(this.modelo, (ruta) => {
    validate(ruta.correo, ({ value }) =>
      value().trim() === '' ? { kind: 'required', message: this.t('dialog.field.required') } : undefined,
    );
    validaCorreo(ruta.correo);
  });

  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  /** Lo que va a viajar: derivado del modelo, no recalculado en cada sitio que lo usa. */
  protected readonly correo = computed(() => this.modelo().correo);

  /**
   * El mensaje que toca enseñar bajo un campo, o nulo si no hay nada que decir todavía. Se calla hasta
   * que el campo se ha TOCADO: pintar de rojo un formulario recién abierto acusa a quien todavía no ha
   * escrito nada.
   */
  protected falloDe<T>(campo: FieldTree<T>): string | null {
    const estado = campo();
    return estado.touched() ? (estado.errors()[0]?.message ?? null) : null;
  }

  protected async guarda(): Promise<void> {
    if (this.formulario().invalid() || this.guardando()) {
      return;
    }
    this.guardando.set(true);
    this.error.set(null);
    try {
      const resultado = await this.anade.ejecuta(this.correo());
      if (resultado.ok) {
        // Se vacía y se vuelve a dejar sin tocar: si no, el campo recién limpiado se pintaría en rojo
        // acusando de vacío a quien acaba de guardar bien.
        this.modelo.set({ correo: '' });
        this.formulario().reset();
        this.anadida.emit();
        return;
      }
      this.error.set(resultado.error.mensaje || this.t('profile.billing.error'));
    } finally {
      this.guardando.set(false);
    }
  }
}
