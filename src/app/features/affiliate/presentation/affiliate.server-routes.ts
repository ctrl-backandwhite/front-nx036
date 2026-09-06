import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Cómo se genera el HTML de «affiliate».
 *
 * <p>`RenderMode.Client`. El panel es distinto para cada afiliado —sus enlaces, sus clics, sus
 * comisiones—, así que escribirlo al construir dejaría en el borde un esqueleto de zona privada que
 * Cloudflare serviría a cualquiera.
 */
export const rutasDeServidor: ServerRoute[] = [
  { path: 'affiliate', renderMode: RenderMode.Client },
];
