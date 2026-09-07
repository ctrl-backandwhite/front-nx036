import { HttpClient, provideHttpClient, withFetch } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideClientHydration, withHttpTransferCacheOptions } from '@angular/platform-browser';
import { describe, expect, it } from 'vitest';
import { ALMACEN_LOCAL } from '../storage/almacen.port';
import { AlmacenMemoriaAdapter } from '../storage/almacen-memoria.adapter';
import { COOKIE_IDIOMA, COOKIE_MONEDA } from '../preferences/preferencias';
import { PaisDelUsuario } from './pais-del-usuario';
import { filtraLaCacheDeTransferencia, sirveLoGuardadoAlCompilar } from './cache-de-transferencia';

/**
 * El defecto que cierra esto: al entrar en una ficha prerenderizada con el euro puesto se veían los
 * precios en dólares, y no se corregían solos. La respuesta guardada al compilar se reaprovechaba porque
 * la clave de la caché de transferencia no mira las cabeceras, y la moneda va justamente en una.
 */
describe('la caché de transferencia solo sirve a quien coincide con lo compilado', () => {
  /** Lo que se guardó al prerenderizar: español, dólares y sin país de registro. */
  const AL_COMPILAR = { idioma: 'es', moneda: 'USD', pais: '' };

  it('sirve cuando las tres coinciden', () => {
    expect(sirveLoGuardadoAlCompilar(AL_COMPILAR)).toBe(true);
  });

  it('NO sirve con otra moneda: son otros importes', () => {
    expect(sirveLoGuardadoAlCompilar({ ...AL_COMPILAR, moneda: 'EUR' })).toBe(false);
  });

  it('NO sirve con otro idioma: son otros títulos y otros mensajes de error', () => {
    expect(sirveLoGuardadoAlCompilar({ ...AL_COMPILAR, idioma: 'fr' })).toBe(false);
  });

  /** El país de registro decide el margen, así que cambia el precio aunque la moneda sea la misma. */
  it('NO sirve con país de registro: el margen es otro', () => {
    expect(sirveLoGuardadoAlCompilar({ ...AL_COMPILAR, pais: 'ES' })).toBe(false);
  });
});

/**
 * Que el filtro FUNCIONE donde Angular lo llama.
 *
 * <p>No es una comprobación de adorno: el filtro pide sus dependencias con `inject`, y Angular lo invoca
 * desde dentro de su propio interceptor de caché. Si ese punto no fuera contexto de inyección, el filtro
 * reventaría en cada petición y la aplicación entera se quedaría sin red — algo que ninguna prueba del
 * predicado suelto llegaría a ver.
 */
describe('el filtro dentro de la cadena de interceptores de verdad', () => {
  function monta(cookies: Record<string, string>) {
    for (const [nombre, valor] of Object.entries(cookies)) {
      document.cookie = `${nombre}=${valor}; Path=/`;
    }

    const decisiones: boolean[] = [];
    TestBed.configureTestingModule({
      providers: [
        { provide: ALMACEN_LOCAL, useValue: new AlmacenMemoriaAdapter() },
        provideHttpClient(withFetch()),
        provideHttpClientTesting(),
        provideClientHydration(
          withHttpTransferCacheOptions({
            filter: (peticion) => {
              const decision = filtraLaCacheDeTransferencia(peticion);
              decisiones.push(decision);
              return decision;
            },
          }),
        ),
      ],
    });
    return { decisiones };
  }

  it('se ejecuta sin reventar y deja pasar a quien coincide con lo compilado', () => {
    const { decisiones } = monta({ [COOKIE_IDIOMA]: 'es', [COOKIE_MONEDA]: 'USD' });

    TestBed.inject(HttpClient).get('/api/catalog/products').subscribe();
    TestBed.inject(HttpTestingController).expectOne('/api/catalog/products').flush([]);

    expect(decisiones, 'Angular no llegó a preguntar por el filtro').not.toEqual([]);
    expect(decisiones.every((x) => x)).toBe(true);
  });

  it('y descarta lo guardado cuando la moneda es otra', () => {
    const { decisiones } = monta({ [COOKIE_IDIOMA]: 'es', [COOKIE_MONEDA]: 'EUR' });

    TestBed.inject(HttpClient).get('/api/catalog/products').subscribe();
    TestBed.inject(HttpTestingController).expectOne('/api/catalog/products').flush([]);

    expect(decisiones.some((x) => x)).toBe(false);
  });

  /** Con sesión el margen cambia, y el precio guardado al compilar es el de quien no ha entrado. */
  it('y también cuando hay país de registro', () => {
    const { decisiones } = monta({ [COOKIE_IDIOMA]: 'es', [COOKIE_MONEDA]: 'USD' });
    TestBed.inject(PaisDelUsuario).fija('ES');

    TestBed.inject(HttpClient).get('/api/catalog/products').subscribe();
    TestBed.inject(HttpTestingController).expectOne('/api/catalog/products').flush([]);

    expect(decisiones.some((x) => x)).toBe(false);
  });
});
