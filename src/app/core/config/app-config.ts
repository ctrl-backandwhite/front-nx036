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

  /**
   * La dirección pública de este entorno, absoluta.
   *
   * <p>La necesitan las etiquetas que leen los buscadores y las aplicaciones de mensajería al compartir
   * un enlace: tienen que llevar dominio, y al generar el HTML durante la compilación no hay ningún
   * navegador del que deducirlo.
   */
  readonly urlPublica: string;

  /** Cómo se llama este entorno. Aparece en diagnósticos. */
  readonly entorno: string;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('AppConfig', {
  providedIn: 'root',
  factory: (): AppConfig => ({
    apiBase: String(environment.apiBase ?? '').replace(/\/+$/, ''),
    produccion: environment.produccion,
    urlPublica: String(environment.urlPublica ?? '').replace(/\/+$/, ''),
    entorno: environment.nombre,
  }),
});
