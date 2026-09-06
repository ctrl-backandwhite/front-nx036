import { Routes } from '@angular/router';
import { exigeSesion } from '@core/auth/sesion.guard';

/**
 * Rutas del contexto «cart».
 *
 * <p>Los proveedores se declaran aquí PARA QUE ESTA PANTALLA FUNCIONE SOLA mientras dura el porte, pero su
 * sitio definitivo es `app.config.ts`, junto a `proveeAuth()`. El motivo es el mismo que allí: la cesta es
 * TRANSVERSAL —la necesitan el cajón lateral, la insignia del icono y, sobre todo, el pago, que no puede
 * declararla porque un contexto no entra en las tripas de otro—. Al subirla a la raíz hay que QUITARLA de
 * aquí: declararla en los dos sitios crearía dos juegos de adaptadores y dos colas de escritura.
 *
 * <p>La cesta EXIGE SESIÓN. En el front anterior era pública porque el carrito de invitado vivía en el
 * navegador, pero esta pantalla enseña además la lista guardada de la cuenta y su contenido depende por
 * completo de quién mira: sin sesión no hay nada que sincronizar y el aviso «se guarda en este navegador»
 * es lo único que se podría pintar.
 */
export const rutas: Routes = [
  {
    path: 'cart',
    canActivate: [exigeSesion],
    loadComponent: () => import('./page/carrito.page').then((m) => m.CarritoPage),
  },
];
