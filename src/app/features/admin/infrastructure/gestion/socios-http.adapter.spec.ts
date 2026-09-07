import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiService } from '@core/http/api.service';
import { APP_CONFIG } from '@core/config/app-config';
import { SociosHttpAdapter } from './socios-http.adapter';

/**
 * Los socios de integración: sus credenciales OAuth y sus entregas de webhook.
 *
 * <p>Aquí se reparten CREDENCIALES, así que la traducción tiene una responsabilidad concreta: el
 * secreto emitido solo llega UNA vez —el servidor no lo vuelve a enseñar— y perderlo por el camino
 * obliga a rotarlo y a coordinar el cambio con quien integra.
 *
 * <p>Y los respaldos importan por lo contrario de lo habitual: un cliente sin nombre comercial se
 * identifica por su `client_id`, que es lo único que quien administra reconoce en una lista.
 */
describe('SociosHttpAdapter', () => {
  function monta() {
    TestBed.configureTestingModule({
      providers: [
        SociosHttpAdapter,
        ApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: APP_CONFIG,
          useValue: { apiBase: '', produccion: false, urlPublica: '', entorno: 'prueba' },
        },
      ],
    });
    return {
      adaptador: TestBed.inject(SociosHttpAdapter),
      red: TestBed.inject(HttpTestingController),
    };
  }

  it('traduce los clientes OAuth al vocabulario del dominio', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.clientes();
    red.expectOne('/api/admin/partners/oauth-clients').flush([
      {
        id: 'c1',
        client_id: 'nx-partner-1',
        client_name: 'Tienda de Ana',
        grant_types: 'client_credentials',
        scopes: 'catalog:read',
      },
    ]);

    const resultado = await enCurso;
    expect(resultado.ok && resultado.valor[0]).toEqual({
      id: 'c1',
      identificador: 'nx-partner-1',
      nombre: 'Tienda de Ana',
      concesiones: 'client_credentials',
      permisos: 'catalog:read',
    });
  });

  /** Sin nombre comercial, el identificador es lo único que quien administra reconoce en la lista. */
  it('un cliente sin nombre se identifica por su identificador', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.clientes();
    red
      .expectOne('/api/admin/partners/oauth-clients')
      .flush([{ id: 'c1', client_id: 'nx-partner-1' }]);

    const resultado = await enCurso;
    expect(resultado.ok && resultado.valor[0].nombre).toBe('nx-partner-1');
    expect(resultado.ok && resultado.valor[0].permisos).toBe('');
  });

  it('una respuesta vacía es una lista vacía', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.clientes();
    red.expectOne('/api/admin/partners/oauth-clients').flush(null);

    const resultado = await enCurso;
    expect(resultado.ok && resultado.valor).toEqual([]);
  });

  /** Una aplicación sin marca se toma como APAGADA: darla por activa la haría recibir eventos reales. */
  it('una aplicación sin marca de actividad cuenta como apagada', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.aplicaciones();
    red
      .expectOne('/api/admin/partners/apps')
      .flush([{ id: 'a1', name: 'Integración', client_id: 'nx-1' }]);

    const resultado = await enCurso;
    expect(resultado.ok && resultado.valor[0].activa).toBe(false);
    /* Sin webhook declarado no se inventa una dirección vacía: la pantalla distingue «no tiene» de
     * «tiene una en blanco». */
    expect(resultado.ok && 'webhook' in resultado.valor[0]).toBe(false);
  });

  it('las entregas traen su estado, sus intentos y el código de respuesta', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.entregas();
    red.expectOne('/api/admin/partners/webhooks').flush([
      {
        id: 'e1',
        event_type: 'ORDER_CREATED',
        status: 'FAILED',
        attempt_count: 3,
        response_code: 502,
        created_at: '2026-09-01T10:00:00Z',
      },
    ]);

    const resultado = await enCurso;
    expect(resultado.ok && resultado.valor[0]).toMatchObject({
      evento: 'ORDER_CREATED',
      estado: 'FAILED',
      intentos: 3,
      codigoDeRespuesta: 502,
    });
  });

  /** Una entrega que nunca llegó a recibir respuesta tiene código NULO, no cero: cero es un estado. */
  it('sin código de respuesta se deja a nulo, no a cero', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.entregas();
    red.expectOne('/api/admin/partners/webhooks').flush([{ id: 'e1' }]);

    const resultado = await enCurso;
    expect(resultado.ok && resultado.valor[0].codigoDeRespuesta).toBeNull();
    expect(resultado.ok && resultado.valor[0].intentos).toBe(0);
  });

  it('crear un cliente devuelve el secreto emitido', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.crea({ nombre: 'Tienda de Ana', permisos: ['catalog:read'] });
    const peticion = red.expectOne('/api/admin/partners/oauth-clients');

    expect(peticion.request.body).toEqual({ name: 'Tienda de Ana', scopes: ['catalog:read'] });
    peticion.flush({
      clientId: 'nx-partner-1',
      clientSecret: 's3cr3t',
      message: 'Guárdalo: no se vuelve a enseñar',
    });

    const resultado = await enCurso;
    /* El secreto llega UNA vez: si se perdiera aquí habría que rotarlo y coordinar el cambio con quien
     * integra. */
    expect(resultado.ok && resultado.valor).toEqual({
      identificador: 'nx-partner-1',
      secreto: 's3cr3t',
      mensaje: 'Guárdalo: no se vuelve a enseñar',
    });
  });

  it('rotar el secreto usa la ruta del cliente y devuelve el nuevo', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.rotaSecreto('nx-partner-1');
    const peticion = red.expectOne('/api/admin/partners/oauth-clients/nx-partner-1/rotate-secret');

    expect(peticion.request.method).toBe('POST');
    peticion.flush({ clientId: 'nx-partner-1', clientSecret: 'otro' });

    const resultado = await enCurso;
    expect(resultado.ok && resultado.valor.secreto).toBe('otro');
    expect(resultado.ok && 'mensaje' in resultado.valor).toBe(false);
  });

  it('borrar un cliente es un DELETE sobre su identificador', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.borra('nx-partner-1');
    const peticion = red.expectOne('/api/admin/partners/oauth-clients/nx-partner-1');

    expect(peticion.request.method).toBe('DELETE');
    peticion.flush({});
    expect((await enCurso).ok).toBe(true);
  });

  it('la prueba de webhooks devuelve cuántos se encolaron', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.pruebaWebhooks();
    red.expectOne('/api/admin/partners/webhooks/test').flush({ queued: 4 });

    const resultado = await enCurso;
    expect(resultado.ok && resultado.valor).toBe(4);
  });

  it('un fallo vuelve como error, no como excepción', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.clientes();
    red
      .expectOne('/api/admin/partners/oauth-clients')
      .flush('no', { status: 403, statusText: 'Forbidden' });

    expect((await enCurso).ok).toBe(false);
  });
});
