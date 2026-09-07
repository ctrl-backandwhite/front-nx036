import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiService } from './api.service';
import { APP_CONFIG } from '@core/config/app-config';

/**
 * El servicio por el que pasan TODAS las peticiones de la aplicación, y no tenía ni una prueba.
 *
 * <p>Es el sitio donde más caro sale un fallo: no rompe una pantalla, las rompe todas a la vez, y de
 * formas que no se parecen entre sí. Aquí se certifica lo que de verdad promete:
 *
 * <ul>
 *   <li>que compone bien la dirección, incluida la base que cambia entre entornos;
 *   <li>que NUNCA lanza: el resto del código está escrito dando por hecho que recibe un `Result`, y una
 *       excepción que se escapara de aquí reventaría en sitios que no la esperan;
 *   <li>que lee el nombre de fichero que propone el servidor incluso con acentos o alfabetos no
 *       latinos, que es el caso que se rompe en cuanto alguien se llama Muñoz.
 * </ul>
 */
describe('ApiService', () => {
  function monta(base = 'http://backend:18082') {
    TestBed.configureTestingModule({
      providers: [
        ApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: APP_CONFIG,
          useValue: { apiBase: base, produccion: false, urlPublica: '', entorno: 'prueba' },
        },
      ],
    });
    return {
      api: TestBed.inject(ApiService),
      red: TestBed.inject(HttpTestingController),
    };
  }

  it('cuelga la ruta del origen configurado, que cambia en cada entorno', async () => {
    const { api, red } = monta('https://api-pre.nx036.com');

    const enCurso = api.get('/catalog/products');
    red.expectOne('https://api-pre.nx036.com/api/catalog/products').flush([]);

    await enCurso;
    red.verify();
  });

  it('un 500 vuelve como fallo, NO como excepción', async () => {
    const { api, red } = monta();

    const enCurso = api.get('/catalog/products');
    red.expectOne((p) => p.url.endsWith('/api/catalog/products')).flush('roto', {
      status: 500,
      statusText: 'Server Error',
    });

    /* Lo que se certifica es que no lanza. Todo el código de arriba hace `if (resultado.ok)`; una
     * excepción escapándose de aquí reventaría en pantallas que no la esperan y sin decir de dónde
     * viene. */
    const resultado = await enCurso;
    expect(resultado.ok).toBe(false);
  });

  it('quedarse sin red tampoco lanza', async () => {
    const { api, red } = monta();

    const enCurso = api.get('/catalog/products');
    red.expectOne((p) => p.url.endsWith('/api/catalog/products')).error(new ProgressEvent('error'));

    const resultado = await enCurso;
    expect(resultado.ok).toBe(false);
  });

  it('los parámetros viajan en la dirección, y los vacíos no', async () => {
    const { api, red } = monta();

    const enCurso = api.get('/catalog/products', { q: 'gorro', pagina: 2, vacio: undefined });
    const peticion = red.expectOne((p) => p.url.endsWith('/api/catalog/products'));

    expect(peticion.request.params.get('q')).toBe('gorro');
    expect(peticion.request.params.get('pagina')).toBe('2');
    expect(peticion.request.params.has('vacio'), 'un parámetro sin valor no debe viajar').toBe(false);

    peticion.flush([]);
    await enCurso;
  });

  it('el cuerpo del POST llega tal cual, y sus cabeceras también', async () => {
    const { api, red } = monta();

    const enCurso = api.post('/orders', { total: 10 }, { cabeceras: { 'Idempotency-Key': 'abc' } });
    const peticion = red.expectOne((p) => p.url.endsWith('/api/orders'));

    expect(peticion.request.body).toEqual({ total: 10 });
    /* La clave de idempotencia es lo que impide cobrar dos veces si alguien pulsa dos veces: si se
     * perdiera por el camino, el fallo aparecería como un cargo duplicado, no como un error. */
    expect(peticion.request.headers.get('Idempotency-Key')).toBe('abc');

    peticion.flush({});
    await enCurso;
  });

  describe('descarga de ficheros', () => {
    it('lee el nombre que propone el servidor', async () => {
      const { api, red } = monta();

      const enCurso = api.descarga('/admin/orders/export');
      red.expectOne((p) => p.url.endsWith('/api/admin/orders/export')).flush(new Blob(['x'], { type: 'text/csv' }), {
        headers: { 'Content-Disposition': 'attachment; filename="pedidos.csv"' },
      });

      const resultado = await enCurso;
      expect(resultado.ok && resultado.valor.nombre).toBe('pedidos.csv');
    });

    it('prefiere la forma que admite acentos y alfabetos no latinos', async () => {
      const { api, red } = monta();

      const enCurso = api.descarga('/admin/orders/export');
      /* Las dos formas vienen juntas a propósito, que es como las manda un servidor bien configurado:
       * la sencilla destroza los acentos y la otra los conserva. Hay que quedarse con la segunda, o
       * quien se apellide Muñoz recibe un fichero con el nombre roto. */
      red.expectOne((p) => p.url.endsWith('/api/admin/orders/export')).flush(new Blob(['x'], { type: 'text/csv' }), {
        headers: {
          'Content-Disposition':
            "attachment; filename=\"pedidos-Munoz.csv\"; filename*=UTF-8''pedidos-Mu%C3%B1oz.csv",
        },
      });

      const resultado = await enCurso;
      expect(resultado.ok && resultado.valor.nombre).toBe('pedidos-Muñoz.csv');
    });

    it('sin nombre propuesto devuelve nulo, y decide quien llama', async () => {
      const { api, red } = monta();

      const enCurso = api.descarga('/admin/orders/export');
      red.expectOne((p) => p.url.endsWith('/api/admin/orders/export')).flush(new Blob(['x'], { type: 'text/csv' }));

      const resultado = await enCurso;
      expect(resultado.ok && resultado.valor.nombre).toBeNull();
    });

    it('un fallo al descargar tampoco lanza', async () => {
      const { api, red } = monta();

      const enCurso = api.descarga('/admin/orders/export');
      /* El cuerpo del error también va como Blob: la petición pide `responseType: 'blob'` y el
       * navegador entrega el cuerpo de un 403 con el mismo tipo que el de un 200. Mandar aquí una
       * cadena probaría una respuesta que en la vida real no llega nunca. */
      red
        .expectOne((p) => p.url.endsWith('/api/admin/orders/export'))
        .flush(new Blob(['no'], { type: 'application/json' }), { status: 403, statusText: 'Forbidden' });

      const resultado = await enCurso;
      expect(resultado.ok).toBe(false);
    });
  });
});
