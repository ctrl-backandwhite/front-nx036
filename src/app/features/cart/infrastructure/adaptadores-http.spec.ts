import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { CarritoHttpAdapter } from './carrito-http.adapter';
import { CarritoGuardadoHttpAdapter } from './carrito-guardado-http.adapter';
import { CotizacionDeCarritoHttpAdapter } from './cotizacion-de-carrito-http.adapter';
import { FichaParaAnadirHttpAdapter } from './ficha-para-anadir-http.adapter';

function monta() {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      CarritoHttpAdapter,
      CarritoGuardadoHttpAdapter,
      CotizacionDeCarritoHttpAdapter,
      FichaParaAnadirHttpAdapter,
    ],
  });
  return TestBed.inject(HttpTestingController);
}

const DTO = {
  productId: 'p1',
  variantId: 'v1',
  sku: 'SKU-1',
  slug: 'gorro',
  title: 'Gorro de lana',
  image: 'foto.webp',
  variantLabel: 'Negro / M',
  unitPriceSource: 117,
  sourceCurrency: 'CNY',
  quantity: 2,
  moq: 5,
  unitPriceDisplay: 14.9,
  displayCurrency: 'EUR',
};

describe('CarritoHttpAdapter', () => {
  it('traduce el vocabulario del backend al del dominio', async () => {
    const http = monta();
    const promesa = TestBed.inject(CarritoHttpAdapter).consulta();

    http.expectOne((r) => r.url.endsWith('/api/me/cart') && r.method === 'GET').flush([DTO]);
    const resultado = await promesa;

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.valor[0]).toEqual({
        productId: 'p1',
        variantId: 'v1',
        sku: 'SKU-1',
        slug: 'gorro',
        titulo: 'Gorro de lana',
        imagen: 'foto.webp',
        etiquetaDeVariante: 'Negro / M',
        precioUnitarioOrigen: 117,
        divisaDeOrigen: 'CNY',
        cantidad: 2,
        pedidoMinimo: 5,
        precioUnitarioMostrado: 14.9,
        divisaMostrada: 'EUR',
      });
    }
  });

  /** La cadena vacía no es un identificador válido y el servidor la rechaza con un 400. */
  it('la variante vacía viaja como ausencia del campo, nunca como cadena vacía', async () => {
    const http = monta();
    const promesa = TestBed.inject(CarritoHttpAdapter).guarda({
      productId: 'p1',
      variantId: '',
      slug: 's',
      titulo: 'T',
      precioUnitarioOrigen: 1,
      divisaDeOrigen: 'CNY',
      cantidad: 1,
    });

    const peticion = http.expectOne((r) => r.url.endsWith('/api/me/cart') && r.method === 'PUT');
    expect(peticion.request.body.variantId).toBeUndefined();
    peticion.flush([]);
    await promesa;
  });

  it('el borrado manda la variante como parámetro', async () => {
    const http = monta();
    const promesa = TestBed.inject(CarritoHttpAdapter).quita({ productId: 'p1', variantId: 'v1' });

    const peticion = http.expectOne((r) => r.url.includes('/api/me/cart/p1') && r.method === 'DELETE');
    expect(peticion.request.params.get('variantId')).toBe('v1');
    peticion.flush([]);
    await promesa;
  });

  it('una respuesta nula se lee como cesta vacía, no como fallo', async () => {
    const http = monta();
    const promesa = TestBed.inject(CarritoHttpAdapter).vacia();

    http.expectOne((r) => r.method === 'DELETE').flush(null);
    const resultado = await promesa;

    expect(resultado.ok && resultado.valor).toEqual([]);
  });

  it('un fallo de red cruza la frontera como AppError, no como excepción', async () => {
    const http = monta();
    const promesa = TestBed.inject(CarritoHttpAdapter).consulta();

    http.expectOne((r) => r.method === 'GET').flush('', { status: 0, statusText: '' });
    const resultado = await promesa;

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error.tipo).toBe('sin-conexion');
    }
  });

  it('la sesión caducada se traduce a «no autenticado»', async () => {
    const http = monta();
    const promesa = TestBed.inject(CarritoHttpAdapter).consulta();

    http.expectOne((r) => r.method === 'GET').flush({ message: 'no' }, { status: 401, statusText: 'x' });
    const resultado = await promesa;

    expect(!resultado.ok && resultado.error.tipo).toBe('no-autenticado');
  });

  it('la fusión manda la lista entera', async () => {
    const http = monta();
    const promesa = TestBed.inject(CarritoHttpAdapter).fusiona([
      { productId: 'p1', slug: 's', titulo: 'T', precioUnitarioOrigen: 1, divisaDeOrigen: 'CNY', cantidad: 2 },
    ]);

    const peticion = http.expectOne((r) => r.url.endsWith('/api/me/cart/merge'));
    expect(peticion.request.body).toHaveLength(1);
    peticion.flush([]);
    await promesa;
  });
});

describe('CarritoGuardadoHttpAdapter', () => {
  it('habla con la lista guardada, no con la cesta', async () => {
    const http = monta();
    const adaptador = TestBed.inject(CarritoGuardadoHttpAdapter);

    const consulta = adaptador.consulta();
    http.expectOne((r) => r.url.endsWith('/api/me/saved-cart') && r.method === 'GET').flush([DTO]);
    expect((await consulta).ok).toBe(true);

    const quita = adaptador.quita({ productId: 'p1' });
    http.expectOne((r) => r.url.endsWith('/api/me/saved-cart/p1')).flush([]);
    await quita;

    const fusiona = adaptador.fusiona([]);
    http.expectOne((r) => r.url.endsWith('/api/me/saved-cart/merge')).flush([]);
    await fusiona;

    const guarda = adaptador.guarda({
      productId: 'p1', slug: 's', titulo: 'T', precioUnitarioOrigen: 1, divisaDeOrigen: 'CNY', cantidad: 1,
    });
    http.expectOne((r) => r.url.endsWith('/api/me/saved-cart') && r.method === 'PUT').flush([]);
    await guarda;
  });
});

describe('CotizacionDeCarritoHttpAdapter', () => {
  /** Al servidor NO le viaja ningún importe: solo qué y cuánto. */
  it('manda producto, variante y cantidad, y traduce los importes ya formateados', async () => {
    const http = monta();
    const promesa = TestBed.inject(CotizacionDeCarritoHttpAdapter).cotiza([
      { productId: 'p1', variantId: '', cantidad: 3 },
    ]);

    const peticion = http.expectOne((r) => r.url.endsWith('/api/catalog/cart-quote'));
    expect(peticion.request.body).toEqual([{ productId: 'p1', variantId: undefined, quantity: 3 }]);
    peticion.flush({
      items: [{ productId: 'p1', unitFormatted: '28,26 €', lineTotalFormatted: '84,78 €', weightGrams: 320 }],
      subtotalFormatted: '84,78 €',
      totalWeightGrams: 960,
      weightIncomplete: true,
    });
    const resultado = await promesa;

    expect(resultado.ok && resultado.valor.subtotalFormateado).toBe('84,78 €');
    expect(resultado.ok && resultado.valor.lineas[0].pesoGramos).toBe(320);
    expect(resultado.ok && resultado.valor.pesoIncompleto).toBe(true);
  });

  it('una respuesta sin líneas no rompe', async () => {
    const http = monta();
    const promesa = TestBed.inject(CotizacionDeCarritoHttpAdapter).cotiza([]);

    http.expectOne((r) => r.url.endsWith('/api/catalog/cart-quote')).flush({});
    const resultado = await promesa;

    expect(resultado.ok && resultado.valor.lineas).toEqual([]);
  });
});

describe('FichaParaAnadirHttpAdapter', () => {
  it('se queda con lo que la cesta usa y descarta el resto de la ficha', async () => {
    const http = monta();
    const promesa = TestBed.inject(FichaParaAnadirHttpAdapter).consulta('gorro', 'es');

    const peticion = http.expectOne((r) => r.url.endsWith('/api/catalog/products/gorro'));
    expect(peticion.request.params.get('lang')).toBe('es');
    peticion.flush({
      moq: 5,
      displayPrice: 14.9,
      displayCurrency: 'EUR',
      description: 'texto largo que no interesa',
      images: [{ id: 'i1' }],
      variants: [{ id: 'v1', sku: 'S', price: 12, stock: 3, active: true, options: { Color: 'Negro' } }],
    });
    const resultado = await promesa;

    expect(resultado.ok && resultado.valor).toEqual({
      pedidoMinimo: 5,
      precioMostrado: 14.9,
      divisaMostrada: 'EUR',
      variantes: [
        { id: 'v1', sku: 'S', precio: 12, existencias: 3, activa: true, opciones: { Color: 'Negro' } },
      ],
    });
  });

  it('un pedido mínimo ausente o a cero vale uno', async () => {
    const http = monta();
    const promesa = TestBed.inject(FichaParaAnadirHttpAdapter).consulta('gorro', 'es');

    http.expectOne((r) => r.url.includes('/catalog/products/gorro')).flush({ moq: 0 });
    const resultado = await promesa;

    expect(resultado.ok && resultado.valor.pedidoMinimo).toBe(1);
  });

  it('una variante sin la marca de activa se considera activa', async () => {
    const http = monta();
    const promesa = TestBed.inject(FichaParaAnadirHttpAdapter).consulta('gorro', 'es');

    http.expectOne((r) => r.url.includes('/catalog/products/gorro')).flush({
      variants: [{ id: 'v1' }],
    });
    const resultado = await promesa;

    expect(resultado.ok && resultado.valor.variantes[0]).toEqual({
      id: 'v1',
      sku: undefined,
      precio: undefined,
      existencias: 0,
      activa: true,
      opciones: {},
    });
  });
});
