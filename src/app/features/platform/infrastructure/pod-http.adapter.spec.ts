import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import {
  DisenosHttpAdapter,
  GeneracionDeDisenoHttpAdapter,
  ProductosEnBlancoHttpAdapter,
} from './pod-http.adapter';

describe('ProductosEnBlancoHttpAdapter', () => {
  let http: HttpTestingController;
  let adaptador: ProductosEnBlancoHttpAdapter;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ProductosEnBlancoHttpAdapter],
    });
    http = TestBed.inject(HttpTestingController);
    adaptador = TestBed.inject(ProductosEnBlancoHttpAdapter);
  });

  afterEach(() => http.verify());

  it('pide el catálogo en el idioma activo', async () => {
    const promesa = adaptador.lista('pt');

    const peticion = http.expectOne((r) => r.url === '/api/pod/blank-products');
    expect(peticion.request.params.get('lang')).toBe('pt');
    peticion.flush([{ id: 'b1', title: 'Camiseta', mainImage: 'https://cdn/1.webp', price: 8.5, currency: 'USD' }]);

    const resultado = await promesa;
    expect(resultado.ok ? resultado.valor[0].titulo : null).toBe('Camiseta');
  });

  it('cae al campo antiguo de imagen mientras queden filas sin migrar', async () => {
    // Sin el respaldo, la rejilla entera salía con el marcador de imagen rota.
    const promesa = adaptador.lista('es');

    http
      .expectOne((r) => r.url === '/api/pod/blank-products')
      .flush([{ id: 'b1', title: 'Taza', image: 'https://cdn/viejo.jpg' }]);

    const resultado = await promesa;
    expect(resultado.ok ? resultado.valor[0].imagen : null).toBe('https://cdn/viejo.jpg');
    // Y sin precio ni divisa, valores por defecto: la tarjeta se pinta igual.
    expect(resultado.ok ? resultado.valor[0].precio : null).toBe(0);
    expect(resultado.ok ? resultado.valor[0].divisa : null).toBe('USD');
  });
});

describe('DisenosHttpAdapter', () => {
  let http: HttpTestingController;
  let adaptador: DisenosHttpAdapter;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), DisenosHttpAdapter],
    });
    http = TestBed.inject(HttpTestingController);
    adaptador = TestBed.inject(DisenosHttpAdapter);
  });

  afterEach(() => http.verify());

  it('traduce un diseño', async () => {
    const promesa = adaptador.mios();

    http.expectOne('/api/me/pod/designs').flush([
      {
        id: 'd1',
        productId: 'b1',
        productTitle: 'Camiseta',
        name: 'Montaña',
        mockupUrl: 'https://cdn/m.webp',
        status: 'READY',
        createdAt: '2026-09-01T00:00:00Z',
      },
    ]);

    const resultado = await promesa;
    expect(resultado.ok ? resultado.valor[0].nombre : null).toBe('Montaña');
    expect(resultado.ok ? resultado.valor[0].tituloDelProducto : null).toBe('Camiseta');
  });

  it('el nombre nuevo viaja CODIFICADO en la consulta', async () => {
    // Sin codificar, un nombre con `&` o con un espacio partía la dirección y el diseño se quedaba
    // con la mitad del nombre.
    const promesa = adaptador.renombra('d1', 'Sol & Playa');

    const peticion = http.expectOne(
      (r) => r.method === 'PUT' && r.urlWithParams.includes('/api/me/pod/designs/d1'),
    );
    expect(peticion.request.urlWithParams).toContain('Sol%20%26%20Playa');
    peticion.flush({ id: 'd1', productId: 'b1', productTitle: 'x', name: 'Sol & Playa', status: 'READY', createdAt: 'x' });

    expect((await promesa).ok).toBe(true);
  });

  it('crea sin mandar una instrucción vacía', async () => {
    const promesa = adaptador.crea({ idProducto: 'b1', nombre: 'Montaña', instruccionIa: '' });

    const peticion = http.expectOne({ method: 'POST', url: '/api/me/pod/designs' });
    expect(peticion.request.body).toEqual({ productId: 'b1', name: 'Montaña', aiPrompt: undefined });
    peticion.flush({ id: 'd1', productId: 'b1', productTitle: 'x', name: 'Montaña', status: 'NEW', createdAt: 'x' });

    expect((await promesa).ok).toBe(true);
  });

  it('elimina un diseño', async () => {
    const promesa = adaptador.elimina('d1');
    http.expectOne({ method: 'DELETE', url: '/api/me/pod/designs/d1' }).flush(null);
    expect((await promesa).ok).toBe(true);
  });
});

describe('GeneracionDeDisenoHttpAdapter', () => {
  let http: HttpTestingController;
  let adaptador: GeneracionDeDisenoHttpAdapter;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), GeneracionDeDisenoHttpAdapter],
    });
    http = TestBed.inject(HttpTestingController);
    adaptador = TestBed.inject(GeneracionDeDisenoHttpAdapter);
  });

  afterEach(() => http.verify());

  it('devuelve la maqueta generada', async () => {
    const promesa = adaptador.genera('Un atardecer minimalista');

    const peticion = http.expectOne({ method: 'POST', url: '/api/me/pod/ai-generate' });
    expect(peticion.request.body).toEqual({ prompt: 'Un atardecer minimalista' });
    peticion.flush({ mockupUrl: 'https://cdn/g.webp', prompt: 'Un atardecer', provider: 'x' });

    const resultado = await promesa;
    expect(resultado.ok ? resultado.valor.maquetaUrl : null).toBe('https://cdn/g.webp');
  });

  it('una instrucción rechazada llega como AppError y no como excepción', async () => {
    // Es el caso más cruel de esta pantalla: el botón vuelve solo de «Generando…» a «Generar» y sin
    // este error no hay forma de distinguir un servicio caído de una instrucción rechazada.
    const promesa = adaptador.genera('algo prohibido');

    http
      .expectOne({ method: 'POST', url: '/api/me/pod/ai-generate' })
      .flush({ message: 'Instrucción rechazada' }, { status: 422, statusText: 'Unprocessable' });

    const resultado = await promesa;
    expect(resultado.ok).toBe(false);
    expect(resultado.ok ? '' : resultado.error.mensaje).toBe('Instrucción rechazada');
  });
});
