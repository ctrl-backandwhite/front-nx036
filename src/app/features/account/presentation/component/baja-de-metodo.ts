import { Component, computed, inject, input, output, signal } from '@angular/core';
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
 */
@Component({
  selector: 'nx-baja-de-metodo',
  imports: [FaIconComponent, VentanaModal, EnfocaAlAparecer],
  template: `
    <nx-ventana-modal [titulo]="t('profile.billing.delete_title')" ancho="max-w-sm" (cierra)="cierra.emit()">
      <fa-icon icono [icon]="iconoBorrar" class="text-error" />

      <p class="text-[13px] text-ink-500 mb-3">{{ t('profile.billing.delete_code_body') }}</p>
      <input
        type="text"
        inputmode="numeric"
        maxlength="6"
        nxEnfocaAlAparecer
        class="input font-mono text-center text-lg tracking-widest w-full"
        [attr.aria-label]="t('profile.billing.code_placeholder')"
        [placeholder]="t('profile.billing.code_placeholder')"
        [value]="codigo()"
        (input)="escribe($event)"
      />
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
          [disabled]="borrando() || !codigoCompleto()"
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

  protected readonly codigo = signal('');
  protected readonly borrando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly codigoCompleto = computed(() => codigoDeBajaDeMetodoCompleto(this.codigo()));

  protected escribe(evento: Event): void {
    // Solo dígitos: el código es numérico y filtrarlo mientras se escribe evita el rechazo del servidor
    // por un espacio o un guion que ni se ven.
    this.codigo.set(soloDigitos((evento.target as HTMLInputElement).value));
    this.error.set(null);
  }

  protected async confirma(): Promise<void> {
    if (!this.codigoCompleto() || this.borrando()) {
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
