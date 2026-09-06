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
