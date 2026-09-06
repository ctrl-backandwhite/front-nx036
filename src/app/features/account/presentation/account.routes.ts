import { Routes } from '@angular/router';
import { proveeAccount } from '../account.providers';
import { exigeSesion } from './guard/sesion-de-cuenta.guard';

/**
 * Rutas del contexto «account».
 *
 * <p>Los proveedores se declaran AQUÍ, en la ruta, y no en el arranque: así los adaptadores del perfil
 * —incluida la pasarela de pago— no pesan en la carga de quien entra solo a mirar el catálogo. Cuelgan
 * de una ruta sin camino que envuelve a las demás, para que la página pública de precios comparta los
 * mismos puertos que el perfil sin repetir la declaración.
 *
 * <p>Los caminos alternativos son los mismos que ya funcionaban en el otro front: hay enlaces
 * publicados y correos enviados con ellos, y romperlos ahora es dejar un 404 en manos de un cliente.
 */
export const rutas: Routes = [
  {
    path: '',
    providers: [proveeAccount()],
    children: [
      {
        path: 'profile',
        canActivate: [exigeSesion],
        loadComponent: () => import('./page/perfil.page').then((m) => m.PerfilPage),
      },
      {
        path: 'addresses',
        canActivate: [exigeSesion],
        loadComponent: () => import('./page/direcciones.page').then((m) => m.DireccionesPage),
      },
      {
        path: 'pricing',
        loadComponent: () => import('./page/planes.page').then((m) => m.PlanesPage),
      },
      { path: 'precios', redirectTo: 'pricing', pathMatch: 'full' },
      { path: 'prices', redirectTo: 'pricing', pathMatch: 'full' },
      { path: 'planes', redirectTo: 'pricing', pathMatch: 'full' },
      { path: 'plans', redirectTo: 'pricing', pathMatch: 'full' },
    ],
  },
];
