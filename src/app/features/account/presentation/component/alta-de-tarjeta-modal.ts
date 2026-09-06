import { Component, inject, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCreditCard } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { CobrosStore } from '../../application/state/cobros.store';
import { AltaDeTarjeta } from './alta-de-tarjeta';
import { VentanaModal } from './ventana-modal';

/**
 * La ventana para añadir una tarjeta al vuelo.
 *
 * <p>Aparece cuando se intenta contratar un plan y no hay ninguna guardada. Usa el MISMO formulario que
 * el perfil, así que la tarjeta aparece después en «Método de pago» sin hacer nada más.
 */
@Component({
  selector: 'nx-alta-de-tarjeta-modal',
  imports: [FaIconComponent, VentanaModal, AltaDeTarjeta],
  template: `
    <nx-ventana-modal [titulo]="t('profile.billing.add_card')" ancho="max-w-md" (cierra)="cierra.emit()">
      <fa-icon icono [icon]="iconoTarjeta" class="text-brand-600" />

      <p class="text-[13px] text-ink-500 mb-2">{{ t('plans.need_card') }}</p>
      @if (cobros.conTarjeta()) {
        <nx-alta-de-tarjeta
          [clavePublicable]="cobros.clavePublicable()"
          [conCabecera]="false"
          (anadida)="anadida.emit()"
        />
      } @else {
        <p role="alert" class="text-[13px] text-error">{{ t('profile.billing.error') }}</p>
      }
    </nx-ventana-modal>
  `,
})
export class AltaDeTarjetaModal {
  readonly cierra = output<void>();
  readonly anadida = output<void>();

  protected readonly cobros = inject(CobrosStore);
  protected readonly t = inject(TraduccionService).t;
  protected readonly iconoTarjeta = faCreditCard;
}
