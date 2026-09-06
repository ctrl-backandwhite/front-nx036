import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { InteligenciaHttpAdapter } from './inteligencia-http.adapter';

describe('InteligenciaHttpAdapter', () => {
  let http: HttpTestingController;
  let adaptador: InteligenciaHttpAdapter;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), InteligenciaHttpAdapter],
    });
    http = TestBed.inject(HttpTestingController);
    adaptador = TestBed.inject(InteligenciaHttpAdapter);
  });

  afterEach(() => http.verify());

  it('traduce una tendencia de anuncio', async () => {
    const promesa = adaptador.anuncios('tiktok', 50);

    const peticion = http.expectOne(
      (r) => r.url === '/api/me/intelligence/ad-trends' && r.params.get('source') === 'tiktok',
    );
    expect(peticion.request.params.get('limit')).toBe('50');
    peticion.flush([
      {
        id: 'a1',
        source: 'tiktok',
        headline: 'Auriculares que arrasan',
        productSlug: 'auriculares-tws',
        engagement: 900,
        score: 0.8,
        region: 'ES',
        capturedAt: '2026-09-01T00:00:00Z',
      },
    ]);

    const resultado = await promesa;
    expect(resultado.ok ? resultado.valor[0].titular : null).toBe('Auriculares que arrasan');
    expect(resultado.ok ? resultado.valor[0].interacciones : null).toBe(900);
  });

  it('sin fuente no manda el parámetro: es «todas», no una fuente vacía', async () => {
    const promesa = adaptador.anuncios(undefined, 10);

    const peticion = http.expectOne((r) => r.url === '/api/me/intelligence/ad-trends');
    expect(peticion.request.params.has('source')).toBe(false);
    peticion.flush([]);

    expect((await promesa).ok).toBe(true);
  });

  it('las tendencias de venta viajan CON el idioma: sus títulos vienen traducidos del backend', async () => {
    const promesa = adaptador.ventas('pt', 30);

    const peticion = http.expectOne((r) => r.url === '/api/me/intelligence/sales-trends');
    expect(peticion.request.params.get('lang')).toBe('pt');
    expect(peticion.request.params.get('limit')).toBe('30');
    peticion.flush([{ slug: 'x', title: 'Fones', monthlySales: 400, price: 72.4 }]);

    const resultado = await promesa;
    expect(resultado.ok ? resultado.valor[0].titulo : null).toBe('Fones');
  });

  it('los productos ganadores también', async () => {
    const promesa = adaptador.ganadores('zh');

    const peticion = http.expectOne((r) => r.url === '/api/me/intelligence/winning-products');
    expect(peticion.request.params.get('lang')).toBe('zh');
    peticion.flush([]);

    expect((await promesa).ok).toBe(true);
  });

  it('crea una alerta con el vocabulario del backend', async () => {
    const promesa = adaptador.crea({ palabraClave: 'gorra', umbral: 0.75, canal: 'EMAIL' });

    const peticion = http.expectOne({ method: 'POST', url: '/api/me/intelligence/alerts' });
    expect(peticion.request.body).toEqual({
      keyword: 'gorra',
      categoryId: undefined,
      channel: 'EMAIL',
      thresholdScore: 0.75,
    });
    peticion.flush({ id: 'a1', channel: 'EMAIL', active: true, createdAt: 'x' });

    expect((await promesa).ok).toBe(true);
  });

  it('lista y borra alertas', async () => {
    const listando = adaptador.lista();
    http
      .expectOne('/api/me/intelligence/alerts')
      .flush([{ id: 'a1', channel: 'PUSH', thresholdScore: 0.6, active: true, createdAt: 'x' }]);
    const listado = await listando;
    expect(listado.ok ? listado.valor[0].umbral : null).toBe(0.6);

    const borrando = adaptador.elimina('a1');
    http.expectOne({ method: 'DELETE', url: '/api/me/intelligence/alerts/a1' }).flush(null);
    expect((await borrando).ok).toBe(true);
  });

  it('un 500 llega como error del servidor', async () => {
    const promesa = adaptador.lista();

    http
      .expectOne('/api/me/intelligence/alerts')
      .flush({ message: 'Vaya' }, { status: 500, statusText: 'Server Error' });

    const resultado = await promesa;
    expect(resultado.ok ? null : resultado.error.tipo).toBe('error-del-servidor');
  });
});
