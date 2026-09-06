import { Component, computed, input } from '@angular/core';
import { RetornoDePago, TextosDeRetorno } from '../component/retorno-de-pago';

const TEXTOS: TextosDeRetorno = {
  confirmando: 'recharge.return.confirming',
  noCerrar: 'recharge.return.dont_close',
  correcto: 'recharge.return.ok',
  redirigiendo: 'recharge.return.redirecting',
  fallo: 'recharge.return.err',
  cancelado: 'recharge.return.cancelled',
  sinIdentificador: 'recharge.return.missing',
  verCartera: 'recharge.return.see_wallet',
};

/**
 * La vuelta del cobro hospedado (Stripe Checkout).
 *
 * <p>Toda la mecánica está en `nx-retorno-de-pago`, compartida con la vuelta de PayPal: son la misma
 * pantalla con otro texto y otra forma de cerrar el cobro. Tenerlas duplicadas era garantizar que un día
 * se arreglara solo una de las dos.
 */
@Component({
  selector: 'nx-retorno-de-recarga',
  imports: [RetornoDePago],
  template: `
    <nx-retorno-de-pago
      [idDePago]="paymentId()"
      [cancelado]="fueCancelado()"
      clase="pasarela"
      [textos]="textos"
    />
  `,
})
export class RetornoDeRecargaPage {
  /** Llega en la dirección de vuelta gracias a `withComponentInputBinding()`. */
  readonly paymentId = input('');
  readonly cancelled = input('');

  protected readonly textos = TEXTOS;
  protected readonly fueCancelado = computed(() => this.cancelled() === '1');
}
