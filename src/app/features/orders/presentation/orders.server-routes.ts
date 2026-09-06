import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Cómo se genera el HTML de «orders».
 *
 * <p>`RenderMode.Client`, las dos. Un pedido depende por completo de quién mira: prerenderizarlo
 * escribiría en el disco —y Cloudflare cachearía en el borde— el esqueleto de una zona privada, y en el
 * peor caso serviría a alguien el armazón de la pantalla de otro. Aquí no hay nada público que ganar:
 * estas direcciones no se comparten ni se indexan.
 */
export const rutasDeServidor: ServerRoute[] = [
  { path: 'orders', renderMode: RenderMode.Client },
  { path: 'orders/:id', renderMode: RenderMode.Client },
];
