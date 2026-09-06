import { Component, inject, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBitcoin } from '@fortawesome/free-brands-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { CobroIniciado } from '../../domain/model/pago';

/**
 * El depósito en cripto: adónde mandarlo y hasta cuándo vale.
 *
 * <p>El botón de «ya lo he enviado» solo sirve donde el proveedor está simulado; en producción el cobro lo
 * marca su aviso automático en cuanto la red confirma la transferencia. Se conserva porque es lo que
 * permite cerrar una compra de prueba de punta a punta en los entornos previos.
 */
@Component({
  selector: 'nx-deposito-en-cripto',
  imports: [FaIconComponent],
  template: `
    <div class="alert alert-info text-xs flex-col items-start gap-2">
      <div class="flex items-center gap-1">
        <fa-icon [icon]="iconoCripto" /> {{ t('checkout.send_usdt') }}
      </div>
      <code class="font-mono text-[11px] break-all">{{ cobro().deposito?.direccion }}</code>
      <div class="opacity-70">
        {{ t('checkout.chain') }}: {{ cobro().deposito?.red }} · {{ t('checkout.expires') }}:
        {{ cobro().deposito?.caducaEl }}
      </div>
      <button type="button" class="btn btn-xs btn-primary mt-1" (click)="confirma.emit()">
        {{ t('checkout.usdt_sent') }}
      </button>
    </div>
  `,
})
export class DepositoEnCripto {
  readonly cobro = input.required<CobroIniciado>();
  readonly confirma = output<void>();

  protected readonly t = inject(TraduccionService).t;
  protected readonly iconoCripto = faBitcoin;
}
