import { Routes } from '@angular/router';
import { exigeRol, exigeSesion } from '@core/auth/sesion.guard';
import { proveeNotifications } from '../notifications.providers';

/**
 * Rutas del contexto «notifications».
 *
 * <p>Los proveedores se declaran AQUÍ y no en la raíz para que el adaptador del buzón no pese en el
 * arranque de quien solo viene a mirar el catálogo.
 *
 * <p>OJO: la campana del escaparate y el desplegable del panel viven en el marco de la página, fuera de
 * estas rutas. Quien monte ese marco tiene que registrar `proveeNotifications()` en la raíz —igual que
 * se hace con `proveeAuth()`—, o esos dos componentes se quedarán sin proveedor para su puerto.
 *
 * <p>El buzón se abre por dos direcciones. Es la misma pantalla; lo único que cambia es que en la del
 * panel se pueden mandar avisos y contestar. Eso llega por los DATOS de la ruta, que es lo que permite
 * no tener que preguntarle a la sesión desde este contexto.
 */
export const rutas: Routes = [
  {
    path: 'notifications',
    canActivate: [exigeSesion],
    providers: [proveeNotifications()],
    loadComponent: () => import('./page/buzon.page').then((m) => m.BuzonPage),
  },
  {
    path: 'admin/notifications',
    // El guardián del NÚCLEO, el mismo para toda la aplicación. Y como esta dirección ya exige papel,
    // es la propia ruta la que sabe que quien mira es de la casa: por eso el dato viaja en `data` y
    // este contexto no tiene que preguntarle nada al de acceso.
    canActivate: [exigeRol('ADMIN', 'OPERATOR')],
    providers: [proveeNotifications()],
    data: { esDeLaCasa: true },
    loadComponent: () => import('./page/buzon.page').then((m) => m.BuzonPage),
  },
  {
    path: 'newsletter/unsubscribe',
    providers: [proveeNotifications()],
    loadComponent: () => import('./page/baja-del-boletin.page').then((m) => m.BajaDelBoletinPage),
  },
];
