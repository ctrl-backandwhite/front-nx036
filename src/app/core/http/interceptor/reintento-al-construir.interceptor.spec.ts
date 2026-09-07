import { HttpErrorResponse, HttpHeaders, HttpRequest, HttpResponse } from '@angular/common/http';
import { Injector, PLATFORM_ID, runInInjectionContext } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { reintentoAlConstruirInterceptor } from './reintento-al-construir.interceptor';

const peticion = new HttpRequest('GET', '/api/catalog/products/una-ficha');

function error429(reintentaEn?: string): HttpErrorResponse {
  return new HttpErrorResponse({
    status: 429,
    headers: new HttpHeaders(reintentaEn ? { 'Retry-After': reintentaEn } : {}),
  });
}

/**
 * Falla las `cuantas` primeras veces y luego responde bien. Cuenta los INTENTOS.
 *
 * <p>La cuenta va DENTRO del `Observable`, no en la función que lo devuelve, y ahí está el detalle que
 * hace falta entender para probar esto: `retry` no vuelve a llamar al siguiente eslabón, se vuelve a
 * SUSCRIBIR al observable que ya tenía. Con un doble que contara al ser llamado, la cuenta se quedaría
 * en uno por muchas veces que reintentara —pasó, y parecía que el interceptor no reintentaba— y con un
 * `throwError` fijo el doble fallaría siempre por mucho que se le pidiera. El cliente HTTP de verdad se
 * comporta como esto: cada suscripción lanza la petición otra vez.
 */
function fallaYLuegoVa(cuantas: number, error: HttpErrorResponse = error429()) {
  let intentos = 0;
  const siguiente = (): Observable<HttpResponse<unknown>> =>
    new Observable<HttpResponse<unknown>>((observador) => {
      intentos++;
      if (intentos <= cuantas) {
        observador.error(error);
        return;
      }
      observador.next(new HttpResponse({ status: 200 }));
      observador.complete();
    });
  return { siguiente, llamadas: () => intentos };
}

/**
 * Lanza el interceptor en la plataforma pedida y ATRAPA el desenlace en el mismo turno.
 *
 * <p>Con inyector propio y no con el del banco de pruebas: ese ya viene montado con la plataforma del
 * navegador, y volver a declararla en `configureTestingModule` no la cambia —se comprobó: el
 * interceptor seguía creyéndose en el navegador y no reintentaba nada—. Además esto es una función:
 * no necesita montar una aplicación para probarse.
 *
 * <p>Y el desenlace se recoge aquí, al crear la promesa, por el reloj falso: entre avanzar el reloj y
 * comprobar el resultado hay un turno en el que un rechazo no tendría quien lo recogiera, y eso se
 * denuncia como fallo aunque la prueba afirme justo eso.
 */
function lanza(plataforma: string, siguiente: () => Observable<HttpResponse<unknown>>) {
  const inyector = Injector.create({ providers: [{ provide: PLATFORM_ID, useValue: plataforma }] });
  return runInInjectionContext(inyector, () =>
    firstValueFrom(reintentoAlConstruirInterceptor(peticion, siguiente)).then(
      (respuesta) => ({ fue: 'bien' as const, respuesta }),
      (error: unknown) => ({ fue: 'mal' as const, error }),
    ),
  );
}

/**
 * Las esperas se prueban con el reloj DE VERDAD y con `Retry-After` de un segundo.
 *
 * <p>Se intentó con el reloj falso de Vitest y no funciona: las dos pruebas que dependen de una espera
 * fallaban mientras las que no dependen de ninguna pasaban, porque el planificador de rxjs no se deja
 * gobernar por él en este montaje. Un par de segundos de prueba es un precio pequeño por comprobar de
 * verdad lo único que aquí importa: que insiste, y que deja de insistir.
 */
describe('reintento ante un 429 al construir', () => {

  /**
   * En el navegador no se toca nada: quien está mirando la web no puede quedarse esperando a que se
   * rellene un cubo, y quien llama ya trata el 429.
   */
  it('en el navegador no reintenta: deja pasar el fallo', async () => {
    const { siguiente, llamadas } = fallaYLuegoVa(1);

    const desenlace = await lanza('browser', siguiente);

    expect(desenlace.fue).toBe('mal');
    expect(llamadas()).toBe(1);
  });

  /** Al construir sí se espera: la alternativa es escribir una página de error en el HTML. */
  it('al construir reintenta el 429 hasta que sale bien', async () => {
    const { siguiente, llamadas } = fallaYLuegoVa(2, error429('1'));

    const desenlace = await lanza('server', siguiente);

    expect(desenlace.fue).toBe('bien');
    expect(llamadas()).toBe(3);
  });

  /** Reintentar un 404 o un 500 solo alargaría la compilación para acabar igual. */
  it('no reintenta nada que no sea un 429', async () => {
    const { siguiente, llamadas } = fallaYLuegoVa(1, new HttpErrorResponse({ status: 500 }));

    const desenlace = await lanza('server', siguiente);

    expect(desenlace.fue).toBe('mal');
    expect(llamadas()).toBe(1);
  });

  /**
   * El plazo lo pone el compilador: `@angular/build` aborta cada ruta a los 30 segundos. Un
   * `Retry-After` de diez minutos tumbaría la compilación entera, así que se topa y se deja de
   * insistir.
   */
  it('se rinde tras unos pocos intentos en vez de esperar sin fin', async () => {
    const { siguiente, llamadas } = fallaYLuegoVa(99, error429('1'));

    const desenlace = await lanza('server', siguiente);

    expect(desenlace.fue).toBe('mal');
    // El intento inicial más los reintentos declarados: ni uno más.
    expect(llamadas()).toBe(5);
  });
});
