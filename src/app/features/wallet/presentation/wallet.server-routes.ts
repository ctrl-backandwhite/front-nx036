import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Cómo se genera el HTML de «wallet».
 *
 * <p>`RenderMode.Client`, todas. El saldo y los movimientos son de quien mira, así que su HTML no puede
 * escribirse al construir ni cachearse en el borde. Las dos pantallas de retorno tampoco: lo que hacen
 * es acreditar un cobro con el identificador que llega en la dirección, y eso solo puede pasar en el
 * navegador de quien acaba de pagar.
 */
export const rutasDeServidor: ServerRoute[] = [
  { path: 'wallet', renderMode: RenderMode.Client },
  { path: 'wallet/recharge', renderMode: RenderMode.Client },
  { path: 'wallet/recharge/return', renderMode: RenderMode.Client },
  { path: 'wallet/paypal-return', renderMode: RenderMode.Client },
];
