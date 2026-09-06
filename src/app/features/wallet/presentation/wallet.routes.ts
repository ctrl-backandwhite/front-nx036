import { Routes } from '@angular/router';
import { proveeCartera } from '../wallet.providers';
import { exigeSesion } from './guard/sesion.guard';

/**
 * Rutas del contexto «wallet».
 *
 * <p>El orden importa: `recharge/return` va ANTES que `recharge`, porque el enrutador se queda con la
 * primera que case y una ruta más específica escrita después nunca llegaría a probarse.
 *
 * <p>Todas exigen sesión: la cartera es de quien la tiene, y el retorno de la pasarela acredita saldo.
 */
export const rutas: Routes = [
  {
    path: 'wallet',
    canActivate: [exigeSesion],
    providers: [proveeCartera()],
    children: [
      {
        path: '',
        loadComponent: () => import('./page/cartera.page').then((m) => m.CarteraPage),
      },
      {
        path: 'recharge/return',
        loadComponent: () =>
          import('./page/retorno-de-recarga.page').then((m) => m.RetornoDeRecargaPage),
      },
      {
        path: 'recharge',
        loadComponent: () => import('./page/recarga.page').then((m) => m.RecargaPage),
      },
      {
        path: 'paypal-return',
        loadComponent: () =>
          import('./page/retorno-de-paypal.page').then((m) => m.RetornoDePaypalPage),
      },
    ],
  },
];
