import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { APP_CONFIG } from '@core/config/app-config';
import { CatalogoHttpAdapter } from './catalogo-http.adapter';
import { FavoritosHttpAdapter, HistorialHttpAdapter } from './favoritos-http.adapter';
import { ResenasHttpAdapter } from './resenas-http.adapter';
import { PromocionesHttpAdapter } from './promociones-http.adapter';
import { AnaliticaHttpAdapter } from './analitica-http.adapter';
import { EdicionDeFichaHttpAdapter } from './edicion-de-ficha-http.adapter';
import { CestaHttpAdapter } from './cesta-http.adapter';
import { CRITERIO_VACIO, GRUPO_DEL_CARRITO } from '../domain/model/criterio-de-busqueda';

const BASE = 'http://api.test';

/**
 * Deja correr la cola de tareas.
 *
 * <p>Hace falta cuando una operación encadena DOS peticiones: la segunda no existe hasta que la
 * primera se ha resuelto, así que reclamarla sin ceder el turno no encuentra nada.
 */
const cedeElTurno = (): Promise<void> => new Promise((sigue) => setTimeout(sigue, 0));

function monta(): HttpTestingController {
  // Cada bloque estrena su módulo: sin este reinicio, el segundo `describe` se encuentra el inyector
  // del primero ya construido y Angular se niega a reconfigurarlo.
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: APP_CONFIG, useValue: { apiBase: BASE, produccion: false } },
      CatalogoHttpAdapter,
      FavoritosHttpAdapter,
      HistorialHttpAdapter,
      ResenasHttpAdapter,
      PromocionesHttpAdapter,
      AnaliticaHttpAdapter,
      CestaHttpAdapter,
    ],
  });
  return TestBed.inject(HttpTestingController);
}

describe('CatalogoHttpAdapter', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    http = monta();
  });

  afterEach(() => http.verify());

  it('traduce el JSON del backend al vocabulario del dominio', async () => {
    const promesa = TestBed.inject(CatalogoHttpAdapter).busca({
      criterio: CRITERIO_VACIO,
      pagina: 0,
      tamano: 36,
    });
    const peticion = http.expectOne((r) => r.url === `${BASE}/api/catalog/products`);
    peticion.flush({
      items: [
        {
          id: 'p1',
          slug: 'gorro',
          title: 'Gorro',
          monthlySales: 12,
          displayFormatted: '9,90 €',
          extraDutyCents: 0,
          dutyCovered: true,
        },
      ],
      page: 0,
      size: 36,
      totalElements: 1,
      totalPages: 1,
    });

    const resultado = await promesa;
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      const producto = resultado.valor.items[0];
      expect(producto.titulo).toBe('Gorro');
      expect(producto.ventasMensuales).toBe(12);
      expect(producto.precio.formateado).toBe('9,90 €');
      expect(producto.arancel.cubierto).toBe(true);
    }
  });

  /**
   * La lista va SEPARADA POR COMAS: es lo que el backend convierte a lista sin ayuda. Serializada de
   * otra manera llegaba vacía y el distintivo de arancel no aparecía sin que nada fallara a la vista.
   */
  it('manda la cesta como una sola cadena separada por comas', async () => {
    void TestBed.inject(CatalogoHttpAdapter).busca({
      criterio: CRITERIO_VACIO,
      pagina: 0,
      tamano: 36,
      productosEnLaCesta: ['a', 'b'],
    });
    const peticion = http.expectOne((r) => r.url === `${BASE}/api/catalog/products`);
    expect(peticion.request.params.get('cartProductIds')).toBe('a,b');
    peticion.flush({ items: [], page: 0, size: 36, totalElements: 0, totalPages: 0 });
  });

  /** El centinela «carrito» no es un grupo: se traduce al interruptor que el servidor entiende. */
  it('traduce el centinela del grupo del carrito', async () => {
    void TestBed.inject(CatalogoHttpAdapter).busca({
      criterio: { ...CRITERIO_VACIO, grupoDeArancel: GRUPO_DEL_CARRITO },
      pagina: 0,
      tamano: 36,
    });
    const peticion = http.expectOne((r) => r.url === `${BASE}/api/catalog/products`);
    expect(peticion.request.params.get('dutyGroupsFromCart')).toBe('true');
    expect(peticion.request.params.get('dutyGroupId')).toBeNull();
    peticion.flush({ items: [], page: 0, size: 36, totalElements: 0, totalPages: 0 });
  });

  it('la dirección de una foto es la del CDN cuando existe', async () => {
    const promesa = TestBed.inject(CatalogoHttpAdapter).ficha('gorro');
    http.expectOne((r) => r.url === `${BASE}/api/catalog/products/gorro`).flush({
      id: 'p1',
      slug: 'gorro',
      title: 'Gorro',
      source: '1688',
      externalId: '1',
      images: [{ id: 'i1', sourceUrl: 'origen.jpg', cdnUrl: 'cdn.jpg', position: 0, role: 'MAIN' }],
    });
    const resultado = await promesa;
    expect(resultado.ok && resultado.valor.imagenes[0].direccion).toBe('cdn.jpg');
  });

  /** El desglose solo llega al administrador: devolverlo vacío pintaría una caja en blanco. */
  it('no inventa desglose cuando el backend no lo manda', async () => {
    const promesa = TestBed.inject(CatalogoHttpAdapter).ficha('gorro');
    http.expectOne((r) => r.url === `${BASE}/api/catalog/products/gorro`).flush({
      id: 'p1',
      slug: 'gorro',
      title: 'Gorro',
      source: '1688',
      externalId: '1',
    });
    const resultado = await promesa;
    expect(resultado.ok && resultado.valor.desglose).toBeUndefined();
  });

  /** Hay idiomas sin poblar: sin respaldo, la ficha técnica salía vacía en ellos. */
  it('las especificaciones vacías se reintentan en español', async () => {
    const promesa = TestBed.inject(CatalogoHttpAdapter).especificaciones('p1', 'nl');
    http.expectOne((r) => r.params.get('lang') === 'nl').flush([]);
    // La segunda petición sale al resolverse la primera, así que hay que dejar correr la cola.
    await cedeElTurno();
    http.expectOne((r) => r.params.get('lang') === 'es').flush([{ key: 'material', value: 'Lana' }]);
    const resultado = await promesa;
    expect(resultado.ok && resultado.valor[0].valor).toBe('Lana');
  });

  it('un fallo del servidor sale como AppError, no como excepción', async () => {
    const promesa = TestBed.inject(CatalogoHttpAdapter).ficha('gorro');
    http
      .expectOne((r) => r.url === `${BASE}/api/catalog/products/gorro`)
      .flush({ message: 'no existe' }, { status: 404, statusText: 'Not Found' });
    const resultado = await promesa;
    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.error.tipo).toBe('no-encontrado');
  });
});

describe('CestaHttpAdapter', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    http = monta();
  });

  afterEach(() => http.verify());

  /** Sin sesión no hay cesta en el servidor: no es un fallo que enseñar. */
  it('sin sesión devuelve la cesta vacía', async () => {
    const promesa = TestBed.inject(CestaHttpAdapter).productosQueLleva();
    http.expectOne(`${BASE}/api/me/cart`).flush({}, { status: 401, statusText: 'Unauthorized' });
    const resultado = await promesa;
    expect(resultado.ok && resultado.valor).toEqual([]);
  });

  it('devuelve los productos sin repetir y en orden estable', async () => {
    const promesa = TestBed.inject(CestaHttpAdapter).productosQueLleva();
    http.expectOne(`${BASE}/api/me/cart`).flush([
      { productId: 'b', quantity: 1 },
      { productId: 'a', quantity: 2 },
      { productId: 'b', quantity: 1 },
    ]);
    const resultado = await promesa;
    expect(resultado.ok && resultado.valor).toEqual(['a', 'b']);
  });

  /** El backend FIJA la cantidad, no la suma: hay que mandar el total resultante. */
  it('suma a lo que ya había en esa línea', async () => {
    const promesa = TestBed.inject(CestaHttpAdapter).anade({
      productId: 'p1',
      slug: 'gorro',
      title: 'Gorro',
      unitPriceSource: 10,
      sourceCurrency: 'EUR',
      quantity: 2,
    });
    http.expectOne(`${BASE}/api/me/cart`).flush([{ productId: 'p1', quantity: 3 }]);
    await cedeElTurno();
    const guardado = http.expectOne((r) => r.method === 'PUT');
    expect(guardado.request.body.quantity).toBe(5);
    // «Sin variante» viaja como ausencia del campo: la cadena vacía no parsea como identificador.
    expect(guardado.request.body.variantId).toBeUndefined();
    guardado.flush([]);
    expect((await promesa).ok).toBe(true);
  });
});

describe('adaptadores de listas', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    http = monta();
  });

  afterEach(() => http.verify());

  it('los favoritos y el historial pegan a sus rutas', async () => {
    void TestBed.inject(FavoritosHttpAdapter).identificadores();
    http.expectOne(`${BASE}/api/me/favorites/ids`).flush(['a']);

    void TestBed.inject(FavoritosHttpAdapter).anade('p1');
    http.expectOne(`${BASE}/api/me/favorites/p1`).flush({});

    void TestBed.inject(FavoritosHttpAdapter).quita('p1');
    http.expectOne(`${BASE}/api/me/favorites/p1`).flush({});

    void TestBed.inject(HistorialHttpAdapter).anota('p1');
    http.expectOne(`${BASE}/api/me/product-views/p1`).flush({});

    void TestBed.inject(HistorialHttpAdapter).lista(0, 24);
    http.expectOne((r) => r.url === `${BASE}/api/me/product-views`).flush({
      items: [],
      page: 0,
      size: 24,
      totalElements: 0,
      totalPages: 0,
    });
  });

  it('las reseñas llegan traducidas al dominio', async () => {
    const promesa = TestBed.inject(ResenasHttpAdapter).lista('p1', 0, 50);
    http.expectOne((r) => r.url === `${BASE}/api/catalog/products/p1/reviews`).flush({
      items: [{ id: 'r1', rating: 5, authorName: 'Ana', source: 'SUPPLIER', language: 'es' }],
      totalElements: 1,
      averageRating: 5,
      distribution: { '5': 1 },
    });
    const resultado = await promesa;
    expect(resultado.ok && resultado.valor.items[0].autor).toBe('Ana');
    expect(resultado.ok && resultado.valor.items[0].origen).toBe('SUPPLIER');
  });

  /** Sin porcentaje no hay nada que anunciar: el cartel diría «hasta −undefined %». */
  it('las promociones sin porcentaje no se anuncian', async () => {
    const promesa = TestBed.inject(PromocionesHttpAdapter).vivas();
    http.expectOne((r) => r.url === `${BASE}/api/catalog/promotions/live`).flush([
      { id: '1', name: 'Sin porcentaje' },
      { id: '2', name: 'Rebajas', percentOff: 30, products: [] },
    ]);
    const resultado = await promesa;
    expect(resultado.ok && resultado.valor.map((p) => p.id)).toEqual(['2']);
  });

  it('la analítica renombra los campos del backend', async () => {
    const promesa = TestBed.inject(AnaliticaHttpAdapter).estimacionDeMargen('p1', 'ES', 1);
    http.expectOne((r) => r.url === `${BASE}/api/catalog/products/p1/margin-estimate`).flush({
      cost: 3,
      suggestedRetail: 10,
      shipping: 1,
      commission: 0.5,
      netProfit: 5.5,
      marginPct: 55,
      currency: 'EUR',
    });
    const resultado = await promesa;
    expect(resultado.ok && resultado.valor.beneficio).toBe(5.5);
    expect(resultado.ok && resultado.valor.divisa).toBe('EUR');
  });
});

describe('EdicionDeFichaHttpAdapter', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { apiBase: BASE, produccion: false } },
        EdicionDeFichaHttpAdapter,
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  /** Mandar los tres pisaría las bolsas de subsidio que no se estaban editando. */
  it('guarda SOLO el importe que se toca', async () => {
    void TestBed.inject(EdicionDeFichaHttpAdapter).guardaImporteEnYuanes('p1', 'dutyUserCny', 12.5);
    const peticion = http.expectOne(`${BASE}/api/admin/catalog/products/p1`);
    expect(peticion.request.body).toEqual({ dutyUserCny: 12.5 });
    peticion.flush({});
  });
});
