import { Component, inject, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faHandHoldingDollar, faTruckRampBox } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';

/**
 * Lo que la tienda paga de su bolsillo por este producto: parte del porte y, donde se cobra, el
 * arancel de aduana.
 *
 * <p>En la TARJETA esto son dos iconos sueltos con su texto en el título emergente: allí la letra
 * competiría con el precio y hay veinte tarjetas a la vez. En la ficha hay sitio y hay una decisión de
 * compra delante, así que van con el texto entero: un icono verde que nadie sabe leer no convence a
 * nadie.
 *
 * <p>Son dos bolsas ESTANCAS —la del porte se descuenta del envío y la del arancel del derecho, y lo
 * que sobra de una no cubre la otra—, por eso se anuncian por separado y no como una sola promesa.
 * El importe no se dice nunca: es un dato interno, y lo que le importa a quien compra es que no lo
 * paga él.
 *
 * <p>MOBILE FIRST: una fila por promesa en el móvil; a partir de `sm` caben las dos en línea.
 */
@Component({
  selector: 'nx-bloque-subsidios',
  imports: [FaIconComponent],
  host: { class: 'block' },
  template: `
    @if (envioCubierto() || arancelCubierto()) {
      <ul class="flex flex-col sm:flex-row sm:flex-wrap gap-x-4 gap-y-1.5 text-[12px]">
        @if (envioCubierto()) {
          <li class="flex items-center gap-2 text-emerald-700">
            <fa-icon [icon]="iconoPorte" class="text-[13px]" />
            <span>{{ t('catalog.shipping.covered') }}</span>
          </li>
        }
        @if (arancelCubierto()) {
          <li class="flex items-center gap-2 text-emerald-700">
            <fa-icon [icon]="iconoArancel" class="text-[13px]" />
            <span>{{ t('catalog.duty.covered') }}</span>
          </li>
        }
      </ul>
    }
  `,
})
export class BloqueSubsidios {
  /** La tienda pone parte del porte. No depende del país: la bolsa se descuenta vaya donde vaya. */
  readonly envioCubierto = input(false);
  /** La tienda paga el derecho de aduana. Solo puede ser cierto donde se cobra por artículo: la Unión. */
  readonly arancelCubierto = input(false);

  protected readonly t = inject(TraduccionService).t;
  // Los MISMOS dibujos que la tarjeta, a propósito: quien llega a la ficha desde el listado tiene que
  // reconocer la promesa que le trajo hasta aquí.
  protected readonly iconoPorte = faTruckRampBox;
  protected readonly iconoArancel = faHandHoldingDollar;
}
