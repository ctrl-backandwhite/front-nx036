import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '../../config/app-config';
import { ALMACEN_LOCAL } from '../../storage/almacen.port';
import { AlmacenMemoriaAdapter } from '../../storage/almacen-memoria.adapter';
import { TokenStore } from '../../auth/token-store';
import { RefrescoDeSesion } from '../refresco-de-sesion';
import { authInterceptor } from './auth.interceptor';

const BACKEND = 'http://backend';

/**
 * La credencial en cada petición, y la renovación cuando caduca.
 *
 * <p>Lo que más importa aquí no es que la ponga: es DÓNDE NO la pone. Sin la comprobación del destino, el
 * día que alguien escribiera una llamada a un tercero —un mapa, una pasarela, un CDN— le estaría
 * entregando el token de sesión de quien la hace, en una cabecera, sin ningún síntoma.
 */
describe('authInterceptor', () => {
  function monta(acceso: string | null = 'token-de-acceso', refresco: string | null = 'refresco') {
    const almacen = new AlmacenMemoriaAdapter();
    if (acceso) {
      almacen.guarda('nx-access-token', acceso);
    }
    if (refresco) {
      almacen.guarda('nx-refresh-token', refresco);
    }
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        TokenStore,
        RefrescoDeSesion,
        { provide: ALMACEN_LOCAL, useValue: almacen },
        {
          provide: APP_CONFIG,
          useValue: { apiBase: BACKEND, produccion: false, urlPublica: '', entorno: 'prueba' },
        },
      ],
    });
    return {
      http: TestBed.inject(HttpClient),
      red: TestBed.inject(HttpTestingController),
      tokens: TestBed.inject(TokenStore),
    };
  }

  it('pone la credencial en las llamadas a nuestro backend', async () => {
    const { http, red } = monta();

    const enCurso = firstValueFrom(http.get(`${BACKEND}/api/me`));
    const peticion = red.expectOne(`${BACKEND}/api/me`);

    expect(peticion.request.headers.get('Authorization')).toBe('Bearer token-de-acceso');
    peticion.flush({});
    await enCurso;
  });

  it('también en las rutas relativas, que son del mismo backend', async () => {
    const { http, red } = monta();

    const enCurso = firstValueFrom(http.get('/api/me'));
    const peticion = red.expectOne('/api/me');

    expect(peticion.request.headers.get('Authorization')).toBe('Bearer token-de-acceso');
    peticion.flush({});
    await enCurso;
  });

  /** La fuga que no da síntomas: el token de sesión viajando a un servidor ajeno. */
  it('NUNCA la pone en una dirección de fuera', async () => {
    const { http, red } = monta();

    const enCurso = firstValueFrom(http.get('https://tercero.example/mapa'));
    const peticion = red.expectOne('https://tercero.example/mapa');

    expect(peticion.request.headers.has('Authorization')).toBe(false);
    peticion.flush({});
    await enCurso;
  });

  it('sin sesión no inventa ninguna cabecera', async () => {
    const { http, red } = monta(null, null);

    const enCurso = firstValueFrom(http.get(`${BACKEND}/api/catalog/products/gorro`));
    const peticion = red.expectOne(`${BACKEND}/api/catalog/products/gorro`);

    expect(peticion.request.headers.has('Authorization')).toBe(false);
    peticion.flush({});
    await enCurso;
  });

  describe('cuando la sesión caduca', () => {
    it('renueva UNA vez y repite la petición con la credencial nueva', async () => {
      const { http, red } = monta();

      const enCurso = firstValueFrom(http.get(`${BACKEND}/api/me`));
      red.expectOne(`${BACKEND}/api/me`).flush('caducado', { status: 401, statusText: 'x' });
      red
        .expectOne(`${BACKEND}/api/auth/refresh`)
        .flush({ token: 'acceso-nuevo', refreshToken: 'refresco-nuevo' });

      const repetida = red.expectOne(`${BACKEND}/api/me`);
      expect(repetida.request.headers.get('Authorization')).toBe('Bearer acceso-nuevo');
      repetida.flush({ id: 'u1' });

      expect(await enCurso).toEqual({ id: 'u1' });
    });

    it('si la renovación tampoco vale, se limpia la sesión y el error sube', async () => {
      const { http, red, tokens } = monta();

      const enCurso = firstValueFrom(http.get(`${BACKEND}/api/me`)).catch((e) => e);
      red.expectOne(`${BACKEND}/api/me`).flush('caducado', { status: 401, statusText: 'x' });
      red.expectOne(`${BACKEND}/api/auth/refresh`).flush('no', { status: 401, statusText: 'x' });

      expect((await enCurso).status).toBe(401);
      /* A quién se manda a la pantalla de acceso lo decide el guardián de ruta, no el cliente HTTP: si
       * navegara desde aquí, cualquier consulta de fondo sacaría de la pantalla a quien está escribiendo. */
      expect(tokens.acceso()).toBeNull();
    });

    /**
     * Un servidor que se está reiniciando NO es una sesión caducada.
     *
     * <p>Antes se borraba la sesión ante cualquier error de la renovación. Bastaba un despliegue, un
     * 502 pasajero o un parpadeo de red para echar de la aplicación a quien estaba navegando, con su
     * testigo todavía bueno y sin nada que mirar después: ya estaba borrado.
     */
    it('un servidor caído no cierra la sesión: el testigo sigue valiendo', async () => {
      const { http, red, tokens } = monta();

      const enCurso = firstValueFrom(http.get(`${BACKEND}/api/me`)).catch((e) => e);
      red.expectOne(`${BACKEND}/api/me`).flush('caducado', { status: 401, statusText: 'x' });
      red.expectOne(`${BACKEND}/api/auth/refresh`).flush('ups', { status: 502, statusText: 'x' });

      await enCurso;
      expect(tokens.acceso()).toBe('token-de-acceso');
      expect(tokens.refresco()).toBe('refresco');
    });

    it('tampoco lo hace un corte de red', async () => {
      const { http, red, tokens } = monta();

      const enCurso = firstValueFrom(http.get(`${BACKEND}/api/me`)).catch((e) => e);
      red.expectOne(`${BACKEND}/api/me`).flush('caducado', { status: 401, statusText: 'x' });
      red.expectOne(`${BACKEND}/api/auth/refresh`).error(new ProgressEvent('error'));

      await enCurso;
      expect(tokens.refresco()).toBe('refresco');
    });

    /** Ni un límite de peticiones: se ha pedido demasiado, no se ha dejado de tener derecho. */
    it('tampoco un 429', async () => {
      const { http, red, tokens } = monta();

      const enCurso = firstValueFrom(http.get(`${BACKEND}/api/me`)).catch((e) => e);
      red.expectOne(`${BACKEND}/api/me`).flush('caducado', { status: 401, statusText: 'x' });
      red.expectOne(`${BACKEND}/api/auth/refresh`).flush('espera', { status: 429, statusText: 'x' });

      await enCurso;
      expect(tokens.refresco()).toBe('refresco');
    });

    /** Si reintentara el propio login, un 401 por contraseña incorrecta entraría en bucle. */
    it('un 401 del PROPIO acceso no dispara ninguna renovación', async () => {
      const { http, red } = monta();

      const enCurso = firstValueFrom(http.post(`${BACKEND}/api/auth/login`, {})).catch((e) => e);
      red.expectOne(`${BACKEND}/api/auth/login`).flush('mal', { status: 401, statusText: 'x' });

      expect((await enCurso).status).toBe(401);
      red.verify();
    });

    it('un 403 no se renueva: hay sesión, lo que falta es permiso', async () => {
      const { http, red } = monta();

      const enCurso = firstValueFrom(http.get(`${BACKEND}/api/admin/users`)).catch((e) => e);
      red.expectOne(`${BACKEND}/api/admin/users`).flush('no', { status: 403, statusText: 'x' });

      expect((await enCurso).status).toBe(403);
      red.verify();
    });

    it('un 401 de un tercero no toca nuestra sesión', async () => {
      const { http, red, tokens } = monta();

      const enCurso = firstValueFrom(http.get('https://tercero.example/x')).catch((e) => e);
      red.expectOne('https://tercero.example/x').flush('no', { status: 401, statusText: 'x' });

      await enCurso;
      expect(tokens.acceso()).toBe('token-de-acceso');
      red.verify();
    });
  });
});
