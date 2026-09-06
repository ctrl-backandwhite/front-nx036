import { Routes } from '@angular/router';
import { exigeRol, exigeSesion } from '@core/auth/sesion.guard';
import { proveeSupport } from '../support.providers';

/**
 * Rutas del contexto «support».
 *
 * <p>Los proveedores se declaran AQUÍ para que quien solo viene a mirar el catálogo no se descargue el
 * adaptador de los tickets.
 *
 * <p>OJO: el asistente y el chat viven en el marco de la página, fuera de estas rutas. Quien monte ese
 * marco tiene que registrar `proveeSupport()` en la raíz —igual que se hace con `proveeAuth()`—, o esos
 * dos componentes se quedarán sin proveedor para sus puertos.
 *
 * <p>`/admin/support` es la bandeja del personal de la casa. En el front anterior esa dirección montaba
 * por error la pantalla del CLIENTE, y la del panel se había quedado huérfana; aquí cada una está en su
 * sitio.
 */
export const rutas: Routes = [
  {
    path: 'support',
    canActivate: [exigeSesion],
    providers: [proveeSupport()],
    loadComponent: () => import('./page/mis-tickets.page').then((m) => m.MisTicketsPage),
  },
  {
    path: 'admin/support',
    canActivate: [exigeRol('ADMIN', 'OPERATOR')],
    providers: [proveeSupport()],
    loadComponent: () =>
      import('./page/tickets-de-soporte.page').then((m) => m.TicketsDeSoportePage),
  },
  {
    path: 'contact',
    providers: [proveeSupport()],
    loadComponent: () => import('./page/contacto.page').then((m) => m.ContactoPage),
  },
];
