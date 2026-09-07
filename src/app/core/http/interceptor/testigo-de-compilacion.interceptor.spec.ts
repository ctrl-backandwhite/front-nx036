import { HttpRequest, HttpResponse } from '@angular/common/http';
import { Injector, PLATFORM_ID, runInInjectionContext } from '@angular/core';
import { Observable, firstValueFrom, of } from 'rxjs';
import { afterEach, describe, expect, it } from 'vitest';
import { CABECERA_DE_COMPILACION, VARIABLE_TESTIGO_DE_COMPILACION } from '@core/config/backend-al-construir';
import { testigoDeCompilacionInterceptor } from './testigo-de-compilacion.interceptor';

const peticion = new HttpRequest('GET', '/api/catalog/products/una-ficha');

/**
 * Lanza el interceptor en la plataforma pedida y devuelve la petición que llegó al siguiente eslabón.
 *
 * <p>Con inyector propio y no con el del banco de pruebas: ese ya viene montado con la plataforma del
 * navegador, y volver a declararla en `configureTestingModule` no la cambia. Es la misma trampa que ya
 * costó un rato en el interceptor de reintentos que vive al lado.
 */
async function lanza(plataforma: string): Promise<HttpRequest<unknown>> {
  let recibida: HttpRequest<unknown> | null = null;
  const siguiente = (p: HttpRequest<unknown>): Observable<HttpResponse<unknown>> => {
    recibida = p;
    return of(new HttpResponse({ status: 200 }));
  };
  const inyector = Injector.create({ providers: [{ provide: PLATFORM_ID, useValue: plataforma }] });
  await runInInjectionContext(inyector, () =>
    firstValueFrom(testigoDeCompilacionInterceptor(peticion, siguiente)),
  );
  return recibida as unknown as HttpRequest<unknown>;
}

/**
 * El testigo con el que la compilación pide su cupo alto al backend.
 *
 * <p>Sin él, prerenderizar 300 fichas choca con el límite anti-volcado del catálogo —100 peticiones por
 * minuto y por IP— y 278 de ellas se escribían con una página de error dentro mientras la compilación
 * terminaba en verde.
 */
describe('testigo de compilación', () => {
  afterEach(() => {
    delete process.env[VARIABLE_TESTIGO_DE_COMPILACION];
  });

  it('al construir manda el testigo que hay en el entorno', async () => {
    process.env[VARIABLE_TESTIGO_DE_COMPILACION] = 'testigo-secreto';

    const enviada = await lanza('server');

    expect(enviada.headers.get(CABECERA_DE_COMPILACION)).toBe('testigo-secreto');
  });

  /**
   * La mitad importante: el testigo NO puede acabar dentro del paquete que se descarga cualquiera. Este
   * mismo código corre en el navegador, y ahí no tiene nada que hacer.
   */
  it('en el navegador no manda nada, aunque hubiera testigo', async () => {
    process.env[VARIABLE_TESTIGO_DE_COMPILACION] = 'testigo-secreto';

    const enviada = await lanza('browser');

    expect(enviada.headers.has(CABECERA_DE_COMPILACION)).toBe(false);
  });

  /** Sin variable puesta no se manda cabecera: una cadena vacía parecería configurada y no lo está. */
  it('sin testigo configurado, la petición sale como siempre', async () => {
    const enviada = await lanza('server');

    expect(enviada.headers.has(CABECERA_DE_COMPILACION)).toBe(false);
  });

  it('un testigo en blanco cuenta como no configurado', async () => {
    process.env[VARIABLE_TESTIGO_DE_COMPILACION] = '   ';

    const enviada = await lanza('server');

    expect(enviada.headers.has(CABECERA_DE_COMPILACION)).toBe(false);
  });
});
