import { Routes } from '@angular/router';
import { RenderMode, ServerRoute } from '@angular/ssr';
import { proveeAdminLogistica } from '../../logistica.providers';
import { exigeRol } from './guard/exige-rol.guard';

/**
 * Rutas del área de PEDIDOS Y LOGÍSTICA del panel.
 *
 * <p>Los proveedores cuelgan de una ruta sin camino que envuelve a todas: así los adaptadores del panel
 * solo se descargan cuando alguien entra a administrar, y no pesan en el arranque de quien viene a mirar
 * el catálogo. Al ir en una sola declaración, las diez pantallas comparten los mismos puertos sin
 * repetirla —y sin que cada una monte su propio adaptador.
 *
 * <p>Todo exige sesión y papel: `ADMIN` para la configuración y `OPERATOR` porque quien procesa los
 * pedidos también trabaja aquí. Esto NO es la seguridad —la aplica el backend en cada petición—, solo
 * evita pintar pantallas que saldrían vacías.
 *
 * <p>Los caminos son los MISMOS que los del front anterior: hay enlaces guardados y correos enviados con
 * ellos, y cambiarlos ahora deja un 404 en manos de quien opera.
 */
export const rutas: Routes = [
  {
    path: '',
    canActivate: [exigeRol('ADMIN', 'OPERATOR')],
    providers: [proveeAdminLogistica()],
    children: [
      {
        path: 'orders',
        loadComponent: () => import('./page/pedidos.page').then((m) => m.PedidosPage),
      },
      {
        path: 'orders/:id',
        loadComponent: () =>
          import('./page/ficha-de-pedido.page').then((m) => m.FichaDePedidoPage),
      },
      { path: 'ordenes', redirectTo: 'orders', pathMatch: 'full' },
      {
        path: 'purchases',
        loadComponent: () => import('./page/compras.page').then((m) => m.ComprasPage),
      },
      {
        path: 'carrier-limits',
        loadComponent: () =>
          import('./page/limites-de-transportista.page').then((m) => m.LimitesDeTransportistaPage),
      },
      {
        path: 'warehouses',
        loadComponent: () => import('./page/almacenes.page').then((m) => m.AlmacenesPage),
      },
      {
        path: 'compliance',
        loadComponent: () => import('./page/cumplimiento.page').then((m) => m.CumplimientoPage),
      },
      {
        path: 'taxes',
        loadComponent: () => import('./page/impuestos.page').then((m) => m.ImpuestosPage),
      },
      {
        path: 'operators',
        loadComponent: () => import('./page/operadores.page').then((m) => m.OperadoresPage),
      },
      {
        path: 'operator/earnings',
        loadComponent: () =>
          import('./page/ganancias-de-operador.page').then((m) => m.GananciasDeOperadorPage),
      },
    ],
  },
];

/**
 * Cómo se genera el HTML de estas pantallas: SIEMPRE en el navegador.
 *
 * <p>Todas dependen de quién mira y de datos que solo existen tras identificarse. Prerenderizarlas
 * dejaría su esqueleto cacheado en el borde y servido a cualquiera. Los caminos van COMPLETOS desde la
 * raíz porque así se declaran las rutas de servidor, aunque las de navegación cuelguen de «admin».
 *
 * <p>Se exporta ya montado para que quien coordina solo tenga que esparcirlo dentro de
 * `admin.server-routes.ts`: esta área no toca ese fichero.
 */
export const rutasDeServidor: ServerRoute[] = [
  'admin/orders',
  'admin/orders/:id',
  'admin/ordenes',
  'admin/purchases',
  'admin/carrier-limits',
  'admin/warehouses',
  'admin/compliance',
  'admin/taxes',
  'admin/operators',
  'admin/operator/earnings',
].map((path) => ({ path, renderMode: RenderMode.Client }));
