import { Routes } from '@angular/router';

/**
 * Rutas del contexto «auth».
 *
 * <p>A diferencia de los demás contextos, «auth» NO declara aquí sus proveedores: van en la raíz
 * (`app.config.ts`). El motivo es que la sesión es transversal — el guardián que protege las rutas de
 * pedidos, cartera o panel pregunta por ella, y esas rutas se pueden abrir directamente sin haber pasado
 * nunca por aquí. Colgarlos de estas rutas dejaba el puerto sin proveedor en cuanto alguien entraba por
 * una dirección profunda, y el fallo aparecía al prerenderizar.
 */
export const rutas: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./page/acceso.page').then((m) => m.AccesoPage),
  },
];
