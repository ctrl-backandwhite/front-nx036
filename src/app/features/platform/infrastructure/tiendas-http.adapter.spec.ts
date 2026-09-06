import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PlataformasDeTiendaHttpAdapter, TiendasHttpAdapter } from './tiendas-http.adapter';

describe('TiendasHttpAdapter', () => {
  let http: HttpTestingController;
  let adaptador: TiendasHttpAdapter;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), TiendasHttpAdapter],
    });
    http = TestBed.inject(HttpTestingController);
    adaptador = TestBed.inject(TiendasHttpAdapter);
  });

  afterEach(() => http.verify());

  it('traduce el vocabulario del backend al del dominio', async () => {
    const promesa = adaptador.lista();

    http.expectOne('/api/me/shops').flush([
      {
        id: 't1',
        platform: 'shopify',
        shopHandle: 'mi-tienda.myshopify.com',
        status: 'CONNECTED',
        lastSyncAt: '2026-09-01T10:00:00Z',
        lastSyncMessage: '12 productos publicados',
        createdAt: '2026-08-01T00:00:00Z',
        listings: 12,
      },
    ]);

    const resultado = await promesa;
    expect(resultado.ok).toBe(true);
    expect(resultado.ok ? resultado.valor[0] : null).toEqual({
      id: 't1',
      plataforma: 'shopify',
      identificador: 'mi-tienda.myshopify.com',
      estado: 'CONNECTED',
      ultimaSincronizacion: '2026-09-01T10:00:00Z',
      mensajeDeSincronizacion: '12 productos publicados',
      errorDeSincronizacion: undefined,
      creadaEl: '2026-08-01T00:00:00Z',
      publicaciones: 12,
    });
  });

  it('una tienda recién conectada sin cuenta de publicaciones se pinta con cero, no con «undefined»', async () => {
    const promesa = adaptador.lista();

    http
      .expectOne('/api/me/shops')
      .flush([{ id: 't1', platform: 'woocommerce', shopHandle: 'x', status: 'PENDING', createdAt: 'x' }]);

    const resultado = await promesa;
    expect(resultado.ok ? resultado.valor[0].publicaciones : null).toBe(0);
  });

  it('manda el token solo cuando lo hay: un token vacío hace fallar a las plataformas que no lo piden', async () => {
    const promesa = adaptador.conecta({ plataforma: 'shopify', identificador: 'x', token: '' });

    const peticion = http.expectOne('/api/me/shops');
    expect(peticion.request.body).toEqual({
      platform: 'shopify',
      shopHandle: 'x',
      accessToken: undefined,
    });
    peticion.flush({ id: 't1', platform: 'shopify', shopHandle: 'x', status: 'CONNECTED', createdAt: 'x', listings: 0 });

    await promesa;
  });

  it('sincronizar y desconectar van a la dirección de esa tienda', async () => {
    const sincronizando = adaptador.sincroniza('t1');
    http
      .expectOne({ method: 'POST', url: '/api/me/shops/t1/sync' })
      .flush({ id: 't1', platform: 'shopify', shopHandle: 'x', status: 'CONNECTED', createdAt: 'x', listings: 3 });
    expect((await sincronizando).ok).toBe(true);

    const desconectando = adaptador.desconecta('t1');
    http.expectOne({ method: 'DELETE', url: '/api/me/shops/t1' }).flush(null);
    expect((await desconectando).ok).toBe(true);
  });

  it('un fallo del servidor llega como AppError, no como excepción', async () => {
    const promesa = adaptador.lista();

    http.expectOne('/api/me/shops').flush(
      { message: 'No autorizado' },
      { status: 401, statusText: 'Unauthorized' },
    );

    const resultado = await promesa;
    expect(resultado.ok).toBe(false);
    expect(resultado.ok ? null : resultado.error.tipo).toBe('no-autenticado');
  });
});

describe('PlataformasDeTiendaHttpAdapter', () => {
  let http: HttpTestingController;
  let adaptador: PlataformasDeTiendaHttpAdapter;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), PlataformasDeTiendaHttpAdapter],
    });
    http = TestBed.inject(HttpTestingController);
    adaptador = TestBed.inject(PlataformasDeTiendaHttpAdapter);
  });

  afterEach(() => http.verify());

  it('traduce el catálogo de plataformas', async () => {
    const promesa = adaptador.lista();

    http
      .expectOne('/api/me/shops/platforms')
      .flush([{ code: 'shopify', label: 'Shopify', available: true }]);

    const resultado = await promesa;
    expect(resultado.ok ? resultado.valor : null).toEqual([
      { codigo: 'shopify', etiqueta: 'Shopify', disponible: true },
    ]);
  });

  it('lo que no diga explícitamente que está disponible, NO lo está', async () => {
    // Al revés, la pantalla ofrecería conectar integraciones que aún no existen y el fallo aparecería
    // al pegar el token, que es donde más se confunde con un error propio.
    const promesa = adaptador.lista();

    http.expectOne('/api/me/shops/platforms').flush([
      { code: 'a', label: 'A' },
      { code: 'b', label: 'B', available: 'sí' },
    ]);

    const resultado = await promesa;
    expect(resultado.ok ? resultado.valor.map((p) => p.disponible) : null).toEqual([false, false]);
  });
});
