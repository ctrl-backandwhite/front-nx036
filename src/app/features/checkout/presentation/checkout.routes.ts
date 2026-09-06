import { Routes } from '@angular/router';
import { exigeSesion } from '@core/auth/sesion.guard';
import { proveeCheckout } from '../checkout.providers';

/**
 * Rutas del contexto «checkout».
 *
 * <p>Los proveedores se declaran en la RUTA PADRE, no en cada hija: el retorno de la pasarela tiene que
 * poder confirmar el cobro y vaciar la cesta, y llega directamente desde fuera del sitio sin haber pasado
 * por el pago. Con los proveedores colgando solo de `/checkout`, esa vuelta se quedaba sin puertos.
 *
 * <p>LA CESTA NO SE ATA AQUÍ. El pago la usa por su contrato público (`CARRITO_COMPARTIDO_PORT`), pero
 * quien ata ese puerto con su implementación es «cart», y un contexto no puede llamar a los proveedores de
 * otro. `proveeCarrito()` tiene que estar declarado en `app.config.ts`; hasta entonces, entrar en el pago
 * falla al inyectar ese puerto, y falla con un mensaje que dice exactamente eso.
 */
export const rutas: Routes = [
  {
    path: 'checkout',
    canActivate: [exigeSesion],
    providers: [proveeCheckout()],
    children: [
      {
        path: '',
        loadComponent: () => import('./page/pago.page').then((m) => m.PagoPage),
      },
      {
        path: 'return',
        loadComponent: () =>
          import('./page/retorno-del-pago.page').then((m) => m.RetornoDelPagoPage),
      },
    ],
  },
];
