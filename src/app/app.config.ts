import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import {
  provideClientHydration,
  withHttpTransferCacheOptions,
  withIncrementalHydration,
} from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withPreloading,
  withViewTransitions,
} from '@angular/router';
import { routes } from './app.routes';
import { proveeNucleo } from './composition/nucleo.providers';
import { proveeAuth } from '@features/auth/auth.providers';
import { PrecargaSelectiva } from '@core/performance/precarga-selectiva';
import { authInterceptor } from '@core/http/interceptor/auth.interceptor';
import { captchaInterceptor } from '@core/http/interceptor/captcha.interceptor';
import { preferenciasInterceptor } from '@core/http/interceptor/preferencias.interceptor';
import { respuestaHtmlInterceptor } from '@core/http/interceptor/respuesta-html.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),

    provideRouter(
      routes,
      // Los parámetros de la dirección llegan al componente como entradas, sin tener que inyectar el
      // enrutador y suscribirse: una pantalla de ficha declara `id = input.required<string>()` y ya.
      withComponentInputBinding(),
      // Transición suave entre pantallas, la del navegador. Es lo que en el front de React hacía una
      // biblioteca de animación entera.
      withViewTransitions(),
      // Al navegar se sube arriba; al volver atrás se recupera dónde estaba. Sin esto, entrar en una
      // ficha desde el listado deja la página a media altura.
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
      // Adelanta de fondo el código de las secciones marcadas, pero solo cuando la primera pantalla ya
      // está servida: precargarlo todo desde el principio compite con lo que la persona está mirando.
      withPreloading(PrecargaSelectiva),
    ),

    provideHttpClient(
      // `fetch` en vez de XHR: es lo que permite que las peticiones hechas al prerenderizar se guarden
      // y el navegador las reaproveche al hidratar, en vez de repetirlas nada más arrancar.
      withFetch(),
      // El ORDEN es el de ejecución. Las preferencias van primero porque las necesitan todas; el captcha
      // antes que la credencial porque puede tardar; y la guardia de HTML la última, para ver la
      // respuesta ya definitiva.
      withInterceptors([
        preferenciasInterceptor,
        captchaInterceptor,
        authInterceptor,
        respuestaHtmlInterceptor,
      ]),
    ),

    /**
     * Hidratación INCREMENTAL.
     *
     * <p>El HTML de las páginas públicas se genera al construir y lo sirve nginx como fichero estático.
     * Esto hace que el navegador lo aproveche en vez de tirarlo y volver a pintarlo: la página se ve
     * antes y no parpadea.
     *
     * <p>«Incremental» quiere decir que cada bloque marcado con `@defer (hydrate on ...)` no descarga su
     * código hasta que hace falta —al aparecer en pantalla, al pasar el ratón, al pulsar—. El pie de
     * página, el chat o el carrusel de abajo del todo dejan de pesar en el arranque, que es justo lo que
     * hacía lento al front anterior.
     */
    provideClientHydration(
      withIncrementalHydration(),
      /**
       * Las peticiones hechas al generar el HTML viajan DENTRO del documento y el navegador las
       * reaprovecha en vez de repetirlas nada más arrancar.
       *
       * <p>Sin esto, el prerenderizado sirve de poco: la página llega pintada y acto seguido pide otra
       * vez los mismos datos, con el parpadeo correspondiente. `includePostRequests` se deja apagado a
       * propósito —una petición que escribe no se puede servir de una caché— y las cabeceras no se
       * incluyen porque llevan la credencial.
       */
      withHttpTransferCacheOptions({
        includePostRequests: false,
        includeHeaders: [],
      }),
    ),

    proveeNucleo(),

    // La sesión es transversal: la consultan los guardianes de todas las zonas privadas.
    proveeAuth(),
  ],
};
