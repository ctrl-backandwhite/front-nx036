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
 *
 * <p>OJO: esta tabla NO es la que se usa. La entrada real de `/affiliate` se declara en la raíz, porque
 * el panel se sirve ENSAMBLADO con el interruptor de correo comercial —que es del contexto del buzón— y
 * un contexto no puede componer con otro. Se conserva aquí la ruta del contexto porque es la que
 * describe qué expone «affiliate» por sí mismo, y para que quien monte este contexto en otro sitio
 * tenga de dónde tirar.
 */
export const rutas: Routes = [
  {
    path: 'affiliate',
    canActivate: [exigeSesion],
    providers: [proveeAfiliado()],
    loadComponent: () => import('./page/afiliado.page').then((m) => m.AfiliadoPage),
  },
];
