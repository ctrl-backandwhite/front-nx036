import { Routes } from '@angular/router';
import { PaginaDeEscaparate } from './layout/escaparate/pagina-de-escaparate';
import { PaginaDePanel } from './layout/admin/pagina-de-panel';
import { rutas as rutasDeAcceso } from '@features/auth/presentation/auth.routes';

/**
 * El mapa de rutas de la aplicación.
 *
 * <p>Aquí no hay ninguna pantalla: solo el reparto por contexto acotado y qué MARCO envuelve a cada
 * grupo. Cada contexto declara sus rutas en su propio fichero y se carga en diferido, de modo que quien
 * entra a mirar el catálogo no se descarga el panel de administración.
 *
 * <p>Tres grupos, y la diferencia entre ellos es el marco:
 *
 * <ul>
 *   <li><b>Sin marco</b> — acceso, alta, activación, restablecer contraseña, vuelta del acceso social y
 *       baja del boletín. Son pantallas que se abren solas, muchas veces desde un correo, y la cabecera
 *       de la tienda alrededor distrae de lo único que hay que hacer en ellas. El front anterior hacía
 *       lo mismo.
 *   <li><b>Marco del escaparate</b> — todo lo demás de cara al público y la zona de cliente.
 *   <li><b>Marco del panel</b> — la administración, con su barra lateral.
 * </ul>
 *
 * <p>El orden importa: lo más específico primero. `admin` va antes que el grupo de camino vacío, o este
 * se lo tragaría.
 */
export const routes: Routes = [
  /* ── Pantallas sueltas, sin marco ──────────────────────────────────────────────────────────
   *
   * Se montan con `...` y no con `loadChildren` bajo un camino vacío. La diferencia no es de estilo:
   * un `path: ''` con carga en diferido CONSUME el intento de resolución, y si el grupo cargado no
   * contiene la dirección pedida, el enrutador no siempre vuelve atrás a probar los grupos siguientes.
   * Con la portada eso se traducía en un documento sin nada dentro.
   *
   * Solo se carga por adelantado la TABLA de rutas, que son unas líneas; cada pantalla sigue
   * descargándose cuando se entra en ella, porque el diferido está en cada `loadComponent`. */
  ...rutasDeAcceso,

  // ── Panel de administración ─────────────────────────────────────────────────────────────────
  {
    path: 'admin',
    component: PaginaDePanel,
    loadChildren: () => import('@features/admin/presentation/admin.routes').then((m) => m.rutas),
  },

  // ── Escaparate y zona de cliente ────────────────────────────────────────────────────────────
  {
    path: '',
    component: PaginaDeEscaparate,
    children: [
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
      // El comodín de «no encontrada» lo declara «platform», así que va el ÚLTIMO: cualquier grupo
      // añadido detrás quedaría tapado por él.
      {
        path: '',
        loadChildren: () => import('@features/platform/presentation/platform.routes').then((m) => m.rutas),
      },
    ],
  },
];
