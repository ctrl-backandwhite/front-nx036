import { ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { APP_CONFIG, AppConfig } from '@core/config/app-config';
import { baseDelBackendAlConstruir } from '@core/config/backend-al-construir';
import { environment } from '@env/environment';

/**
 * La configuración con la que se GENERA el HTML.
 *
 * <p>Lo único que cambia respecto a la del navegador es de dónde salen los datos: `apiBase` deja de
 * estar vacío y apunta al backend interno. El porqué —y el fallo silencioso que provoca no hacerlo—
 * está escrito en `@core/config/backend-al-construir`, que es también de donde lee la elección de qué
 * fichas se prerenderizan. Los dos leen la MISMA variable desde el MISMO sitio a propósito: si
 * discreparan, saldría una compilación con páginas vacías y sin ningún error.
 */
const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    {
      provide: APP_CONFIG,
      useValue: {
        apiBase: baseDelBackendAlConstruir(),
        produccion: environment.produccion,
        urlPublica: String(environment.urlPublica ?? '').replace(/\/+$/, ''),
        entorno: environment.nombre,
      } satisfies AppConfig,
    },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
