import { Routes } from '@angular/router';
import { proveeAfiliado } from '../affiliate.providers';
import { exigeSesion } from './guard/sesion.guard';

/**
 * Rutas del contexto «affiliate».
 *
 * <p>Solo una: el panel del afiliado. La captura del referido no es una ruta —es un componente que se
 * monta en el marco de la aplicación, porque un enlace de afiliado puede apuntar a cualquier página.
 *
 * <p>El escaparate monta además este mismo panel en `/admin/affiliate`; esa entrada la declara la tabla
 * de rutas del panel de administración, que es quien manda en ese prefijo.
 */
export const rutas: Routes = [
  {
    path: 'affiliate',
    canActivate: [exigeSesion],
    providers: [proveeAfiliado()],
    loadComponent: () => import('./page/afiliado.page').then((m) => m.AfiliadoPage),
  },
];
