import { ServerRoute } from '@angular/ssr';
import { rutasDeServidor as catalogo } from './catalogo/catalogo.server-routes';
import { rutasDeServidor as gestion } from './gestion/gestion.server-routes';
import { rutasDeServidor as logistica } from './logistica/logistica.routes';

/**
 * Cómo se genera el HTML del panel: **todo en el navegador, nada prerenderizado**.
 *
 * <p>Cada área declara las suyas y aquí solo se juntan. Que esto no falte es importante de verdad: el
 * comodín de `app.routes.server.ts` PRERENDERIZA por defecto, que es lo correcto para el escaparate y
 * exactamente lo contrario de lo que necesita el panel. Sin estas tres líneas, el esqueleto de las
 * pantallas de administración se escribiría al construir y acabaría cacheado en el borde.
 */
export const rutasDeServidor: ServerRoute[] = [...catalogo, ...logistica, ...gestion];
