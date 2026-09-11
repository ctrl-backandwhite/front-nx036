import { Routes } from '@angular/router';
import { exigeSesion } from '@core/auth/sesion.guard';
import { proveeCatalogo } from '../catalog.providers';

/**
 * Rutas del contexto «catalog».
 *
 * <p>Cada contexto declara las suyas y `app.routes.ts` las carga en diferido. Es lo que hace que el
 * navegador se baje solo la parte de la aplicación que hace falta, y de paso que dos equipos puedan
 * trabajar en contextos distintos sin editar el mismo fichero.
 *
 * <p>Los proveedores cuelgan de estas rutas, no del arranque: quien entra a su cuenta no se descarga
 * los adaptadores del catálogo.
 *
 * <p>La ficha va con `/catalog/:slug` y con `/admin/browse/:slug`: es la MISMA pantalla, y lo único que
 * cambia es el marco desde el que se abre. Duplicarla para el panel fue lo que en el front anterior
 * dejó dos fichas que había que corregir dos veces.
 */
export const rutas: Routes = [
  {
    path: '',
    providers: [proveeCatalogo()],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./page/portada.page').then((m) => m.PortadaPage),
      },
      {
        // El listado es la ruta más visitada después de la portada, y a la que se llega desde ella con
        // un solo gesto: su código se adelanta de fondo un par de segundos después del arranque, para
        // que al pulsar ya esté. Antes competiría con lo que se está mirando.
        path: 'catalog',
        // El listado COMPLETO es interno: la portada solo enseña el adelanto.
        canActivate: [exigeSesion],
        data: { precarga: true },
        loadComponent: () => import('./page/listado.page').then((m) => m.ListadoPage),
      },
      {
        // Misma razón: del listado a una ficha se pasa siempre, y es donde se decide la compra.
        path: 'catalog/:slug',
        // La ficha es INTERNA, igual que el listado: el precio con margen, el desglose de aranceles y
        // el proveedor solo se enseñan a quien tiene cuenta. Sin esto se llegaba al detalle completo
        // con la dirección directa, saltándose el listado que sí estaba cerrado.
        canActivate: [exigeSesion],
        data: { precarga: true },
        loadComponent: () => import('./page/ficha.page').then((m) => m.FichaPage),
      },
      {
        path: 'favorites',
        canActivate: [exigeSesion],
        loadComponent: () => import('./page/favoritos.page').then((m) => m.FavoritosPage),
      },
      {
        path: 'history',
        canActivate: [exigeSesion],
        loadComponent: () => import('./page/historial.page').then((m) => m.HistorialPage),
      },
    ],
  },
];
