import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { retry, timer } from 'rxjs';

/**
 * Reintentos ante un 429, SOLO mientras se genera el HTML.
 *
 * ── El problema, medido ─────────────────────────────────────────────────────────────────────────
 *
 * El backend limita el catálogo público a 100 peticiones por minuto y por IP. No es un descuido: es
 * una defensa deliberada contra el volcado masivo del catálogo, y está escrita así en su
 * `RateLimitFilter` («frena el volcado masivo del catálogo/fichas sin molestar a un humano»).
 *
 * Y prerenderizar fichas es, visto desde el backend, exactamente un volcado masivo: el compilador pide
 * las fichas tan deprisa como puede. Con 300 fichas —unas cuatro llamadas cada una— se agota el cupo
 * del primer minuto y todo lo demás recibe 429.
 *
 * Lo grave es CÓMO falla. La aplicación trata el 429 como cualquier otro fallo de red y pinta su
 * pantalla de «no se ha podido cargar este producto». El compilador escribe esa pantalla en el HTML,
 * la da por prerenderizada y termina en verde. Medido antes de este fichero: de 300 fichas, 278
 * quedaron con el mensaje de error y el título genérico del sitio dentro. O sea, el prerenderizado no
 * solo no arreglaba nada: dejaba a los robots una página de error donde antes había un esqueleto.
 *
 * ── Por qué el reintento va aquí y solo aquí ────────────────────────────────────────────────────
 *
 * En el NAVEGADOR no se toca nada: quien está mirando la web no puede quedarse esperando un minuto a
 * que se rellene un cubo, y un 429 a un humano significa otra cosa —o hay abuso, o algo va mal— y
 * quien llama ya lo trata. Por eso lo primero que hace es comprobar la plataforma y apartarse.
 *
 * Al CONSTRUIR sí se puede esperar un poco: no hay nadie delante y la alternativa es publicar páginas
 * de error. Se mira el `Retry-After` que manda el propio backend, porque es él quien sabe cuándo se
 * rellena el cubo, pero se topa: ver abajo por qué el techo no lo ponemos nosotros.
 *
 * <p>Esto era, además, LENTO a propósito: a 100 peticiones por minuto, prerenderizar 300 fichas son
 * varios minutos de espera pura. Eso ya no hace falta pagarlo, porque la solución buena está puesta:
 * la compilación se identifica con el testigo de `NEXADROP_PRERENDER_TOKEN` y el backend le concede un
 * cupo alto en vez de las cien del escaparate (ver `testigo-de-compilacion.interceptor.ts`).
 *
 * <p>Y aun así esto se queda, porque es la red de debajo: si el testigo no está configurado, si se
 * escribe mal, o si con el cupo alto se llegara al tope igualmente, la alternativa a esperar un poco es
 * publicar fichas con una página de error dentro.
 */

/**
 * El presupuesto de espera lo fija el COMPILADOR, no nosotros: `@angular/build` aborta cada ruta a los
 * 30 segundos (`AbortSignal.timeout(30_000)` en su `render-worker`), y ese plazo no se puede
 * configurar. Pasarse no da más margen: da una ruta abortada y la compilación entera en rojo.
 *
 * <p>Se comprobó por las malas. Con esperas de hasta un minuto —respetando el `Retry-After` del
 * backend al pie de la letra— el build falló con «Request for: … was aborted / The operation was
 * aborted due to timeout». Cuatro intentos de cuatro segundos son dieciséis, que dejan sitio de sobra
 * para la petición en sí dentro de los treinta.
 *
 * <p>Y esperar SIRVE aunque sea poco: el cubo del backend no se rellena de golpe cada minuto, se
 * rellena de forma continua —cien por minuto son unas 1,7 peticiones por segundo—, así que cada espera
 * corta libera unas cuantas.
 */
const INTENTOS = 4;

/** Tope de cada espera. El `Retry-After` del backend se respeta solo si pide menos que esto. */
const ESPERA_MAXIMA_MS = 4_000;

export const reintentoAlConstruirInterceptor: HttpInterceptorFn = (peticion, siguiente) => {
  if (!isPlatformServer(inject(PLATFORM_ID))) {
    return siguiente(peticion);
  }

  return siguiente(peticion).pipe(
    retry({
      count: INTENTOS,
      delay: (error: unknown, intento: number) => {
        // Cualquier otro fallo se propaga tal cual: reintentar un 404 o un 500 solo alargaría la
        // compilación para acabar igual.
        if (!(error instanceof HttpErrorResponse) || error.status !== 429) {
          throw error;
        }
        return timer(esperaMs(error, intento));
      },
    }),
  );
};

/** Lo que dice el backend que hay que esperar; y si no lo dice, una espera que se dobla. */
function esperaMs(error: HttpErrorResponse, intento: number): number {
  const declarada = Number(error.headers.get('Retry-After'));
  const segundos = Number.isFinite(declarada) && declarada > 0 ? declarada : intento;
  return Math.min(segundos * 1000, ESPERA_MAXIMA_MS);
}
