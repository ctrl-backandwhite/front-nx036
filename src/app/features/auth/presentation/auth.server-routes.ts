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
];
