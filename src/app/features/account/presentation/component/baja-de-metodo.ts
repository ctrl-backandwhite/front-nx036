import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FieldTree, FormField, form, maxLength, validate } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { EnfocaAlAparecer } from '@ds/directive/enfoca-al-aparecer.directive';
import { codigoDeBajaDeMetodoCompleto, soloDigitos } from '../../domain/model/cobro';
import { EliminaMetodoDePago } from '../../application/use-case/cobros.use-case';
import { VentanaModal } from './ventana-modal';

/**
 * Confirmar la baja de un método de pago con el código enviado al correo.
 *
 * <p>Se pide un código porque quitar la tarjeta con la que se cobra la suscripción tiene consecuencias:
 * quien entrara un minuto con la sesión abierta podría dejar la cuenta sin cobro sin que el titular se
 * enterase.
 *
 * <p>El campo lo lleva Signal Forms sobre un modelo de una sola cadena. El largo máximo se declara en el
 * ESQUEMA y no como atributo: la directiva lo proyecta ella misma al elemento, y así la pantalla y la
 * regla no pueden acabar diciendo cosas distintas.
 */
@Component({
  selector: 'nx-baja-de-metodo',
  imports: [FaIconComponent, VentanaModal, EnfocaAlAparecer, FormField],
  template: `
    <nx-ventana-modal [titulo]="t('profile.billing.delete_title')" ancho="max-w-sm" (cierra)="cierra.emit()">
      <fa-icon icono [icon]="iconoBorrar" class="text-error" />

      <p class="text-[13px] text-ink-500 mb-3">{{ t('profile.billing.delete_code_body') }}</p>
      <input
        type="text"
        inputmode="numeric"
        nxEnfocaAlAparecer
        class="input font-mono text-center text-lg tracking-widest w-full"
        [attr.aria-label]="t('profile.billing.code_placeholder')"
        [placeholder]="t('profile.billing.code_placeholder')"
        [formField]="formulario"
        (input)="soloNumeros($event)"
      />
      @if (falloDe(formulario); as fallo) {
        <p role="alert" class="text-error text-[12px] mt-2">{{ fallo }}</p>
      }
      @if (error(); as mensaje) {
        <p role="alert" class="text-error text-[12px] mt-2">{{ mensaje }}</p>
      }
      <div class="flex justify-end gap-2 mt-4">
        <button type="button" class="btn btn-outline text-[12px]" (click)="cierra.emit()">
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          class="btn btn-error text-[12px]"
          [disabled]="borrando() || formulario().invalid()"
          (click)="confirma()"
        >
          {{ borrando() ? t('common.saving') : t('common.confirm') }}
        </button>
      </div>
    </nx-ventana-modal>
  `,
})
export class BajaDeMetodo {
  readonly referencia = input.required<string>();
  readonly cierra = output<void>();
  readonly eliminado = output<void>();

  private readonly traduccion = inject(TraduccionService);
  private readonly elimina = inject(EliminaMetodoDePago);

  protected readonly t = this.traduccion.t;
  protected readonly iconoBorrar = faTrash;

  protected readonly escrito = signal('');

  /**
   * El código son seis dígitos. Se declara en dos tramos porque dicen cosas distintas: vacío es «te lo
   * has dejado» e incompleto es «eso no tiene forma de código». Los dos tienen ya su texto —antes el
   * segundo se quedaba mudo y el botón apagado sin explicación—, y solo salen cuando el campo se ha
   * tocado, así que no regañan a media escritura.
   */
  protected readonly formulario = form(this.escrito, (ruta) => {
    maxLength(ruta, 6, { message: () => this.t('dialog.field.maxlength') });
    validate(ruta, ({ value }) => {
      if (value() === '') {
        return { kind: 'required', message: this.t('dialog.field.required') };
      }
      return codigoDeBajaDeMetodoCompleto(value())
        ? undefined
        : { kind: 'pattern', message: this.t('dialog.field.pattern') };
    });
  });

  protected readonly borrando = signal(false);
  protected readonly error = signal<string | null>(null);

  /** El código tal como va a viajar. Derivado, no recalculado en cada sitio que lo usa. */
  protected readonly codigo = computed(() => this.escrito());

  /**
   * Solo dígitos: el código es numérico y filtrarlo mientras se escribe evita el rechazo del servidor
   * por un espacio o un guion que ni se ven.
   *
   * <p>Se corrige el CONTROL y además el modelo, y en ese orden. La directiva del formulario y este
   * escuchador atienden el mismo evento y no hay garantía de cuál va primero: tocando solo el modelo,
   * la directiva podría leer después el valor crudo del control y deshacer el filtro.
   */
  protected soloNumeros(evento: Event): void {
    const control = evento.target as HTMLInputElement;
    const limpio = soloDigitos(control.value);
    if (control.value !== limpio) {
      control.value = limpio;
    }
    if (this.escrito() !== limpio) {
      this.escrito.set(limpio);
    }
    this.error.set(null);
  }

  /**
   * El mensaje que toca enseñar bajo un campo, o nulo si no hay nada que decir todavía. Se calla hasta
   * que el campo se ha TOCADO: pintar de rojo una ventana recién abierta acusa a quien todavía no ha
   * escrito nada.
   */
  protected falloDe<T>(campo: FieldTree<T>): string | null {
    const estado = campo();
    return estado.touched() ? (estado.errors()[0]?.message ?? null) : null;
  }

  protected async confirma(): Promise<void> {
    if (this.formulario().invalid() || this.borrando()) {
      return;
    }
    this.borrando.set(true);
    try {
      const resultado = await this.elimina.ejecuta(this.referencia(), this.codigo());
      if (resultado.ok) {
        this.eliminado.emit();
        this.cierra.emit();
        return;
      }
      this.error.set(resultado.error.mensaje || this.t('profile.billing.error'));
    } finally {
      this.borrando.set(false);
    }
  }
}
