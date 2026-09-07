import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '../config/app-config';
import { ALMACEN_LOCAL } from '../storage/almacen.port';
import { AlmacenMemoriaAdapter } from '../storage/almacen-memoria.adapter';
import { TokenStore } from '../auth/token-store';
import { RefrescoDeSesion } from './refresco-de-sesion';

/**
 * La renovación de la sesión, y sobre todo su VUELO ÚNICO.
 *
 * <p>Es el detalle que solo se rompe con concurrencia, o sea justo donde no se mira: al volver a una
 * pestaña que llevaba horas abierta caducan a la vez todas las peticiones en marcha. Como cada
 * renovación invalida el token de refresco anterior, si cada petición pidiera el suyo, la última en
 * llegar encontraría el suyo ya inservible y cerraría la sesión de alguien que no había hecho nada.
 *
 * <p>Contar peticiones es la única forma de comprobarlo: con una sola llamada, las dos versiones —la que
 * comparte el vuelo y la que no— se comportan exactamente igual.
 */
describe('RefrescoDeSesion', () => {
  function monta(refresco: string | null = 'refresco-viejo') {
    const almacen = new AlmacenMemoriaAdapter();
    if (refresco) {
      almacen.guarda('nx-refresh-token', refresco);
    }
    TestBed.configureTestingModule({
      providers: [
        RefrescoDeSesion,
        TokenStore,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ALMACEN_LOCAL, useValue: almacen },
        {
          provide: APP_CONFIG,
          useValue: { apiBase: 'http://backend', produccion: false, urlPublica: '', entorno: 'prueba' },
        },
      ],
    });
    return {
      renovacion: TestBed.inject(RefrescoDeSesion),
      tokens: TestBed.inject(TokenStore),
      red: TestBed.inject(HttpTestingController),
    };
  }

  it('sin token de refresco no se molesta al servidor', async () => {
    const { renovacion, red } = monta(null);

    expect(await firstValueFrom(renovacion.renueva())).toBeNull();
    red.verify();
  });

  it('renueva y guarda el par nuevo', async () => {
    const { renovacion, tokens, red } = monta();

    const enCurso = firstValueFrom(renovacion.renueva());
    red
      .expectOne('http://backend/api/auth/refresh')
      .flush({ token: 'acceso-nuevo', refreshToken: 'refresco-nuevo' });

    expect(await enCurso).toBe('acceso-nuevo');
    expect(tokens.acceso()).toBe('acceso-nuevo');
    expect(tokens.refresco()).toBe('refresco-nuevo');
  });

  it('diez peticiones caducadas a la vez piden UNA sola renovación', async () => {
    const { renovacion, red } = monta();

    const enCurso = Array.from({ length: 10 }, () => firstValueFrom(renovacion.renueva()));
    /* `expectOne` falla si hubiera más de una: eso es exactamente lo que se quiere comprobar. */
    red
      .expectOne('http://backend/api/auth/refresh')
      .flush({ token: 'acceso-nuevo', refreshToken: 'refresco-nuevo' });

    expect(await Promise.all(enCurso)).toEqual(Array(10).fill('acceso-nuevo'));
    red.verify();
  });

  it('cuando la renovación falla, la sesión se limpia y se dice que no', async () => {
    const { renovacion, tokens, red } = monta();

    const enCurso = firstValueFrom(renovacion.renueva());
    red
      .expectOne('http://backend/api/auth/refresh')
      .flush('caducado', { status: 401, statusText: 'Unauthorized' });

    expect(await enCurso).toBeNull();
    expect(tokens.acceso()).toBeNull();
    expect(tokens.refresco()).toBeNull();
  });

  it('terminado un vuelo, el siguiente 401 vuelve a pedir renovación', async () => {
    const { renovacion, red } = monta();

    const primera = firstValueFrom(renovacion.renueva());
    red.expectOne('http://backend/api/auth/refresh').flush({ token: 'a1', refreshToken: 'r1' });
    await primera;

    /* Si el vuelo no se soltara al terminar, la sesión no se podría renovar NUNCA más: la segunda
     * caducidad se quedaría esperando un observable ya consumido. */
    const segunda = firstValueFrom(renovacion.renueva());
    red.expectOne('http://backend/api/auth/refresh').flush({ token: 'a2', refreshToken: 'r2' });

    expect(await segunda).toBe('a2');
  });
});
