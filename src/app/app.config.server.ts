import { ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { APP_CONFIG, AppConfig } from '@core/config/app-config';
import { environment } from '@env/environment';

/**
 * La dirección del backend MIENTRAS SE CONSTRUYE.
 *
 * <p>Este es el detalle que decide si el prerenderizado sirve de algo. En el navegador, la API vive en
 * el mismo origen y basta con pedir `/api/...`; pero al generar el HTML no hay navegador ni origen: el
 * código corre en Node, y una ruta relativa no apunta a ninguna parte. Las peticiones fallan **en
 * silencio** y la página se escribe con sus marcadores de carga puestos.
 *
 * <p>Así estaba: el HTML de la portada pesaba 63 kB y contenía 1.035 caracteres de texto, ningún
 * precio y ningún producto — solo la maqueta. Se pagaba la complejidad del prerenderizado sin cobrar
 * su beneficio: ni los buscadores veían el catálogo, ni la ficha de un producto llevaba su título al
 * compartirla, que era el motivo de montar todo esto.
 *
 * <p>Es exactamente el mismo fallo que tuvo el front anterior con su renderizado en servidor, y por la
 * misma causa. Por eso la variable se llama igual: quien la configure en el despliegue configura las
 * dos.
 *
 * <p>El valor por defecto apunta al backend por su nombre de servicio, que es como se alcanza dentro
 * del clúster. En un equipo de desarrollo se apunta al puerto local.
 */
function baseDelBackendAlConstruir(): string {
  const declarada = typeof process !== 'undefined' ? process.env['NEXADROP_API_INTERNA'] : undefined;
  return (declarada ?? 'http://backend:18082').replace(/\/+$/, '');
}

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
