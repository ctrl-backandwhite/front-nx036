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
 * <p>Eso lo decía este comentario y el código NO lo hacía: había UN guardián para las diez pantallas,
 * con los dos papeles, así que quien da soporte entraba también en compras, almacenes, aranceles,
 * límites de transportista, cumplimiento y el informe de operadores. El reparto se escribe ahora ruta a
 * ruta y sigue exactamente la regla del backend (`BffSecurityConfig`): solo `/api/admin/orders/**` y
 * `/api/admin/operator/**` admiten OPERATOR. Ojo con `/api/admin/operators/**`, en plural: es el
 * informe de operadores, otra ruta, y es de administración.
 *
 * <p>Los caminos son los MISMOS que los del front anterior: hay enlaces guardados y correos enviados con
 * ellos, y cambiarlos ahora deja un 404 en manos de quien opera.
 */
export const rutas: Routes = [
  {
    path: '',
    // La unión de los dos papeles: es la puerta del área. Cada pantalla afina debajo.
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
        canActivate: [exigeRol('ADMIN')],
        loadComponent: () => import('./page/compras.page').then((m) => m.ComprasPage),
      },
      {
        path: 'carrier-limits',
        canActivate: [exigeRol('ADMIN')],
        loadComponent: () =>
          import('./page/limites-de-transportista.page').then((m) => m.LimitesDeTransportistaPage),
      },
      {
        path: 'warehouses',
        canActivate: [exigeRol('ADMIN')],
        loadComponent: () => import('./page/almacenes.page').then((m) => m.AlmacenesPage),
      },
      {
        path: 'compliance',
        canActivate: [exigeRol('ADMIN')],
        loadComponent: () => import('./page/cumplimiento.page').then((m) => m.CumplimientoPage),
      },
      {
        path: 'taxes',
        canActivate: [exigeRol('ADMIN')],
        loadComponent: () => import('./page/impuestos.page').then((m) => m.ImpuestosPage),
      },
      {
        path: 'operators',
        canActivate: [exigeRol('ADMIN')],
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
