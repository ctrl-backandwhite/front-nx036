import { Routes } from '@angular/router';
import { proveePedidos } from '../orders.providers';
import { exigeSesion } from './guard/sesion.guard';

/**
 * Rutas del contexto «orders».
 *
 * <p>Los proveedores se declaran AQUÍ y no en la raíz: así los adaptadores de pedidos solo se cargan
 * cuando alguien entra a mirar sus pedidos, y no pesan en el arranque de quien viene a ver el catálogo.
 *
 * <p>Las dos exigen sesión: un pedido es de quien lo hizo.
 */
export const rutas: Routes = [
  {
    path: 'orders',
    canActivate: [exigeSesion],
    providers: [proveePedidos()],
    children: [
      {
        path: '',
        loadComponent: () => import('./page/pedidos.page').then((m) => m.PedidosPage),
      },
      {
        path: ':id',
        loadComponent: () => import('./page/pedido.page').then((m) => m.PedidoPage),
      },
    ],
  },
];
