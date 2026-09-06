import { InjectionToken } from '@angular/core';
import { environment } from '@env/environment';

/**
 * La configuración de la aplicación, inyectable.
 *
 * <p>Va por token y no leyendo `environment` desde cualquier sitio a propósito: así una prueba puede
 * cambiar la dirección del backend sin tocar ficheros, y se ve de un vistazo qué depende de la
 * configuración —basta buscar quién pide este token.
 */
export interface AppConfig {
  /**
   * Raíz del backend SIN la barra final ni el sufijo `/api`.
   *
   * <p>Vacío en local y en el despliegue normal: la aplicación y el backend comparten origen y nginx
   * hace de pasarela, así que basta con rutas relativas. Se rellena solo cuando la interfaz vive en un
   * dominio y el backend en otro.
   */
  readonly apiBase: string;
  readonly produccion: boolean;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('AppConfig', {
  providedIn: 'root',
  factory: (): AppConfig => ({
    apiBase: String(environment.apiBase ?? '').replace(/\/+$/, ''),
    produccion: environment.produccion,
  }),
});
