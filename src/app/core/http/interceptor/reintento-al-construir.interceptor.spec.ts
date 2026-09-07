import { HttpErrorResponse, HttpHeaders, HttpRequest, HttpResponse } from '@angular/common/http';
import { Injector, PLATFORM_ID, runInInjectionContext } from '@angular/core';
import { Observable, firstValueFrom, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reintentoAlConstruirInterceptor } from './reintento-al-construir.interceptor';

const peticion = new HttpRequest('GET', '/api/catalog/products/una-ficha');

function error429(reintentaEn?: string): HttpErrorResponse {
  return new HttpErrorResponse({
    status: 429,
    headers: new HttpHeaders(reintentaEn ? { 'Retry-After': reintentaEn } : {}),
  });
}

/** Falla `cuantas` veces y luego responde bien. Cuenta cuántas veces la han llamado. */
function fallaYLuegoVa(cuantas: number, error: HttpErrorResponse = error429()) {
  let llamadas = 0;
  const siguiente = (): Observable<HttpResponse<unknown>> => {
    llamadas++;
    return llamadas <= cuantas
      ? throwError(() => error)
      : new Observable<HttpResponse<unknown>>((observador) => {
          observador.next(new HttpResponse({ status: 200 }));
          observador.complete();
        });
  };
  return { siguiente, llamadas: () => llamadas };
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

describe('reintento ante un 429 al construir', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

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
    const { siguiente, llamadas } = fallaYLuegoVa(2);

    const desenlace = lanza('server', siguiente);
    await vi.advanceTimersByTimeAsync(20_000);

    expect((await desenlace).fue).toBe('bien');
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
    const { siguiente, llamadas } = fallaYLuegoVa(99, error429('600'));

    const desenlace = lanza('server', siguiente);
    await vi.advanceTimersByTimeAsync(60_000);

    expect((await desenlace).fue).toBe('mal');
    // El intento inicial más los reintentos declarados: ni uno más.
    expect(llamadas()).toBe(5);
  });
});
