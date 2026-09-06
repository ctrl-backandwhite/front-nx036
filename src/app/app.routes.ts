import { Routes } from '@angular/router';

/**
 * El mapa de rutas de la aplicación.
 *
 * <p>Aquí no hay ninguna pantalla: solo el reparto por contexto acotado. Cada contexto declara sus rutas
 * en su propio fichero y se carga EN DIFERIDO, de modo que quien entra a mirar el catálogo no se descarga
 * el panel de administración. Con ciento y pico pantallas, esa diferencia es la mitad del tiempo de
 * arranque.
 *
 * <p>El orden importa: las rutas más específicas primero y el comodín al final.
 */
export const routes: Routes = [
  {
    path: 'admin',
    loadChildren: () => import('@features/admin/presentation/admin.routes').then((m) => m.rutas),
  },
  {
    path: '',
    loadChildren: () => import('@features/auth/presentation/auth.routes').then((m) => m.rutas),
  },
  {
    path: '',
    loadChildren: () => import('@features/catalog/presentation/catalog.routes').then((m) => m.rutas),
  },
  {
    path: '',
    loadChildren: () => import('@features/cart/presentation/cart.routes').then((m) => m.rutas),
  },
  {
    path: '',
    loadChildren: () => import('@features/checkout/presentation/checkout.routes').then((m) => m.rutas),
  },
  {
    path: '',
    loadChildren: () => import('@features/orders/presentation/orders.routes').then((m) => m.rutas),
  },
  {
    path: '',
    loadChildren: () => import('@features/wallet/presentation/wallet.routes').then((m) => m.rutas),
  },
  {
    path: '',
    loadChildren: () => import('@features/account/presentation/account.routes').then((m) => m.rutas),
  },
  {
    path: '',
    loadChildren: () => import('@features/affiliate/presentation/affiliate.routes').then((m) => m.rutas),
  },
  {
    path: '',
    loadChildren: () =>
      import('@features/notifications/presentation/notifications.routes').then((m) => m.rutas),
  },
  {
    path: '',
    loadChildren: () => import('@features/support/presentation/support.routes').then((m) => m.rutas),
  },
  {
    path: '',
    loadChildren: () => import('@features/platform/presentation/platform.routes').then((m) => m.rutas),
  },
];
