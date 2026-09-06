import { Component, computed, input } from '@angular/core';
import { RetornoDePago, TextosDeRetorno } from '../component/retorno-de-pago';

const TEXTOS: TextosDeRetorno = {
  confirmando: 'paypal.return.capturing',
  noCerrar: 'paypal.return.dont_close',
  correcto: 'paypal.return.ok',
  redirigiendo: 'paypal.return.redirecting',
  fallo: 'paypal.return.err',
  cancelado: 'paypal.return.cancelled',
  sinIdentificador: 'paypal.return.missing_id',
  verCartera: 'recharge.back_to_wallet',
};

/** Cuánto se espera antes de llevar a la cartera. PayPal tarda algo más en asentar su respuesta. */
const ESPERA_MS = 1500;

/**
 * La vuelta de PayPal, donde se CAPTURA el pago aprobado.
 *
 * <p>PayPal devuelve el identificador unas veces como `paymentId` y otras como `token`, según por dónde
 * se haya entrado en su aprobación. Se aceptan los dos: quedarse con uno dejaba la captura sin hacer y
 * el dinero aprobado sin cobrar.
 */
@Component({
  selector: 'nx-retorno-de-paypal',
  imports: [RetornoDePago],
  template: `
    <nx-retorno-de-pago
      [idDePago]="identificador()"
      [cancelado]="fueCancelado()"
      clase="paypal"
      [textos]="textos"
      [esperaMs]="espera"
    />
  `,
})
export class RetornoDePaypalPage {
  readonly paymentId = input('');
  readonly token = input('');
  readonly cancelled = input('');

  protected readonly textos = TEXTOS;
  protected readonly espera = ESPERA_MS;
  protected readonly identificador = computed(() => this.paymentId() || this.token());
  protected readonly fueCancelado = computed(() => this.cancelled() === '1');
}
