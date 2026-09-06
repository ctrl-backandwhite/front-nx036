import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Cómo se genera el HTML de «auth».
 *
 * <p>Las pantallas de acceso SÍ se prerenderizan: son públicas, iguales para todo el mundo y de las
 * primeras que abre alguien que llega de fuera, así que conviene que lleguen ya pintadas. Lo que cambia
 * según quién mira no es la pantalla, sino adónde te lleva después de entrar.
 */
export const rutasDeServidor: ServerRoute[] = [
  { path: 'login', renderMode: RenderMode.Prerender },
  { path: 'register', renderMode: RenderMode.Prerender },
  /*
   * La ACTIVACIÓN y el RESTABLECIMIENTO se prerenderizan igual: el HTML es el mismo para todo el
   * mundo. Lo que cambia —el código o el testigo— llega en la dirección, y eso lo resuelve el
   * navegador al hidratar; no forma parte del HTML que se guarda en el borde.
   */
  { path: 'activate', renderMode: RenderMode.Prerender },
  { path: 'password-reset', renderMode: RenderMode.Prerender },
  /*
   * El RETORNO del acceso social NO se prerenderiza. Su trabajo entero —leer el fragmento, guardar los
   * testigos, averiguar quién ha entrado y decidir adónde va— solo existe en el navegador, y su
   * resultado depende de quién mira. Un esqueleto suyo cacheado en el borde no ahorraría nada y
   * dejaría en el nodo una página cuyo único cometido es tratar credenciales.
   */
  { path: 'auth/callback', renderMode: RenderMode.Client },
];
