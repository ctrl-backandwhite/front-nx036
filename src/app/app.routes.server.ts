import { RenderMode, ServerRoute } from '@angular/ssr';
import { rutasDeServidor as account } from '@features/account/presentation/account.server-routes';
import { rutasDeServidor as admin } from '@features/admin/presentation/admin.server-routes';
import { rutasDeServidor as affiliate } from '@features/affiliate/presentation/affiliate.server-routes';
import { rutasDeServidor as auth } from '@features/auth/presentation/auth.server-routes';
import { rutasDeServidor as cart } from '@features/cart/presentation/cart.server-routes';
import { rutasDeServidor as catalog } from '@features/catalog/presentation/catalog.server-routes';
import { rutasDeServidor as checkout } from '@features/checkout/presentation/checkout.server-routes';
import { rutasDeServidor as notifications } from '@features/notifications/presentation/notifications.server-routes';
import { rutasDeServidor as orders } from '@features/orders/presentation/orders.server-routes';
import { rutasDeServidor as platform } from '@features/platform/presentation/platform.server-routes';
import { rutasDeServidor as support } from '@features/support/presentation/support.server-routes';
import { rutasDeServidor as wallet } from '@features/wallet/presentation/wallet.server-routes';

/**
 * Cómo se genera el HTML de cada ruta. NO hay servidor en ejecución: esto se resuelve al CONSTRUIR.
 *
 * <p>Aquí solo se JUNTA lo que declara cada contexto. La decisión de si una pantalla se escribe al
 * construir o la monta el navegador vive junto a la pantalla, que es donde se sabe.
 *
 * <p>El comodín final PRERENDERIZA: el escaparate público es la mayoría y su HTML es el mismo para todo
 * el mundo, así que se escribe una vez, lo sirve nginx como fichero estático y Cloudflare lo guarda en el
 * nodo más cercano. Es lo que recupera las etiquetas de compartir que se perdieron al apagar el
 * renderizado en servidor, sin volver a pagar su lentitud.
 */
export const serverRoutes: ServerRoute[] = [
  /* Las tres pantallas del ESCAPARATE que `app.routes.ts` compone dentro del marco del panel. Se
   * declaran aquí y no en un contexto porque aquí es donde se componen: ninguno de los dos —«catalog»
   * y «affiliate»— sabe que existen bajo `/admin`.
   *
   * Sin estas líneas el comodín del final se las traga y el build FALLA en seco: `admin/browse/:slug`
   * lleva parámetro, y prerenderizar una ruta con parámetro exige decir cuáles. Y aunque no fallara,
   * son pantallas de sesión: su HTML no puede escribirse al construir. */
  { path: 'admin/browse', renderMode: RenderMode.Client },
  { path: 'admin/browse/:slug', renderMode: RenderMode.Client },
  { path: 'admin/affiliate', renderMode: RenderMode.Client },

  ...admin,
  ...auth,
  ...account,
  ...affiliate,
  ...cart,
  ...catalog,
  ...checkout,
  ...notifications,
  ...orders,
  ...platform,
  ...support,
  ...wallet,
  { path: '**', renderMode: RenderMode.Prerender },
];
