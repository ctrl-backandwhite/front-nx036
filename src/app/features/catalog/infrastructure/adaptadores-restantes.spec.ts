import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { APP_CONFIG } from '@core/config/app-config';
import { CatalogoHttpAdapter } from './catalogo-http.adapter';
import { EdicionDeFichaHttpAdapter } from './edicion-de-ficha-http.adapter';
import { GuiaDeBienvenidaHttpAdapter } from './guia-de-bienvenida-http.adapter';
import { AnaliticaHttpAdapter } from './analitica-http.adapter';
import { ResenasHttpAdapter } from './resenas-http.adapter';
import { FavoritosHttpAdapter } from './favoritos-http.adapter';
import { PaisesDeEnvioHttpAdapter } from './paises-de-envio-http.adapter';
import { AltaEnElBoletinHttpAdapter } from './alta-en-el-boletin-http.adapter';

const BASE = 'http://api.test';

describe('el resto de los adaptadores', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { apiBase: BASE, produccion: false } },
        CatalogoHttpAdapter,
        EdicionDeFichaHttpAdapter,
        GuiaDeBienvenidaHttpAdapter,
        AnaliticaHttpAdapter,
        ResenasHttpAdapter,
        FavoritosHttpAdapter,
        PaisesDeEnvioHttpAdapter,
        AltaEnElBoletinHttpAdapter,
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('los relacionados llegan traducidos al dominio', async () => {
    const promesa = TestBed.inject(CatalogoHttpAdapter).relacionados('p1', 4);
    const peticion = http.expectOne((r) => r.url === `${BASE}/api/catalog/products/p1/related`);
    expect(peticion.request.params.get('limit')).toBe('4');
    peticion.flush([{ id: 'r1', slug: 'otro', title: 'Otro', displayFormatted: '5,00 €' }]);
    const resultado = await promesa;
    expect(resultado.ok && resultado.valor[0].titulo).toBe('Otro');
  });

  it('las categorías conservan su jerarquía y su recuento', async () => {
    const promesa = TestBed.inject(CatalogoHttpAdapter).arbolDeCategorias();
    http.expectOne((r) => r.url === `${BASE}/api/catalog/categories/tree`).flush([
      {
        id: 'c1',
        slug: 'moda',
        name: 'Moda',
        directProductCount: 0,
        children: [{ id: 'c2', slug: 'gorros', name: 'Gorros', directProductCount: 7 }],
      },
    ]);
    const resultado = await promesa;
    expect(resultado.ok && resultado.valor[0].hijas[0].cuantosProductos).toBe(7);
  });

  it('las categorías raíz y los proveedores tienen su propia llamada', async () => {
    void TestBed.inject(CatalogoHttpAdapter).categoriasRaiz();
    http.expectOne((r) => r.url === `${BASE}/api/catalog/categories`).flush([]);

    void TestBed.inject(CatalogoHttpAdapter).proveedores();
    http.expectOne(`${BASE}/api/catalog/suppliers`).flush([
      { id: 's1', slug: 'p', name: 'Proveedor', country: 'CN' },
    ]);
  });

  it('la portada trae sus hileras y su total', async () => {
    const promesa = TestBed.inject(CatalogoHttpAdapter).secciones(6);
    const peticion = http.expectOne((r) => r.url === `${BASE}/api/catalog/home/sections`);
    expect(peticion.request.params.get('perSection')).toBe('6');
    peticion.flush({
      sections: [{ code: 'trending', title: 'Tendencia', items: [{ id: 'p1', slug: 'a', title: 'A' }] }],
      hotCategories: [{ id: 'c1', slug: 'gorros', name: 'Gorros' }],
      totalProducts: 42,
    });
    const resultado = await promesa;
    expect(resultado.ok && resultado.valor.totalDeProductos).toBe(42);
    expect(resultado.ok && resultado.valor.secciones[0].items[0].titulo).toBe('A');
  });

  /** La ficha completa: variantes, ejes, tramos, cumplimiento y el desglose que solo ve el admin. */
  it('traduce la ficha entera, incluido el desglose de administración', async () => {
    const promesa = TestBed.inject(CatalogoHttpAdapter).ficha('gorro');
    http.expectOne((r) => r.url === `${BASE}/api/catalog/products/gorro`).flush({
      id: 'p1',
      slug: 'gorro',
      title: 'Gorro',
      source: '1688',
      externalId: 'EXT',
      moq: 6,
      reviewCount: 3,
      baseFormatted: '8,00 €',
      surchargeCny: 7,
      surchargeFormatted: '1,00 €',
      compliance: {
        manufacturerName: 'Fábrica',
        safetyWarnings: ['Aviso'],
        responsiblePerson: {
          name: 'Rep',
          addressLine: 'Calle',
          city: 'Madrid',
          country: 'ES',
          email: 'a@b.c',
          roleLabel: 'Importador',
        },
      },
      specifications: [{ key: 'material', value: 'Lana', position: 1 }],
      variants: [
        {
          id: 'v1',
          stock: 3,
          options: { Talla: 'S' },
          active: true,
          weightGrams: 250,
          lengthMm: 100,
        },
      ],
      variantOptions: [
        {
          id: 'o1',
          nameZh: '尺码',
          name: 'Talla',
          position: 0,
          values: [{ id: 'v', valueZh: 'S', position: 0 }],
        },
      ],
      priceTiers: [{ minQty: 10, unitPrice: 8, currency: 'EUR' }],
    });
    const resultado = await promesa;
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      const ficha = resultado.valor;
      expect(ficha.moq).toBe(6);
      expect(ficha.desglose?.recargoCny).toBe(7);
      expect(ficha.cumplimiento?.operadorEuropeo?.papel).toBe('Importador');
      expect(ficha.variantes[0].pesoGramos).toBe(250);
      expect(ficha.ejesDeVariante[0].nombre).toBe('Talla');
      expect(ficha.tramosDePrecio[0].cantidadMinima).toBe(10);
      expect(ficha.especificaciones[0].clave).toBe('material');
    }
  });

  it('las especificaciones en español no se reintentan', async () => {
    const promesa = TestBed.inject(CatalogoHttpAdapter).especificaciones('p1', 'es');
    http.expectOne((r) => r.params.get('lang') === 'es').flush([]);
    const resultado = await promesa;
    expect(resultado.ok && resultado.valor).toEqual([]);
  });

  it('el editor pega a cada endpoint de administración', async () => {
    const editor = TestBed.inject(EdicionDeFichaHttpAdapter);

    void editor.marcaVerificado('p1', true);
    http.expectOne((r) => r.url.startsWith(`${BASE}/api/admin/catalog/products/p1`)).flush({});

    void editor.guardaUrlDeOrigen('p1', 'https://detail.1688.com/offer/1.html');
    http.expectOne((r) => r.url.includes('/source-url')).flush({});

    void editor.borraImagen('i1');
    http.expectOne(`${BASE}/api/admin/catalog/products/images/i1`).flush({});

    void editor.anadeImagen('p1', 'foto.jpg');
    http.expectOne(`${BASE}/api/admin/catalog/products/p1/images`).flush({});

    void editor.reordenaImagenes('p1', ['b', 'a']);
    const orden = http.expectOne(`${BASE}/api/admin/catalog/products/p1/images/order`);
    expect(orden.request.body).toEqual({ imageIds: ['b', 'a'] });
    orden.flush({});

    void editor.borraValorDeVariante('vv1');
    http.expectOne(`${BASE}/api/admin/catalog/variant-values/vv1`).flush({});

    void editor.borraVideo('p1');
    http.expectOne(`${BASE}/api/admin/catalog/products/p1/video`).flush({});

    void editor.borraProducto('p1');
    http.expectOne(`${BASE}/api/admin/catalog/products/p1`).flush({});
  });

  it('la guía trae sus ejemplos y su simulación', async () => {
    const guia = TestBed.inject(GuiaDeBienvenidaHttpAdapter);

    const ejemplos = guia.ejemplos();
    http.expectOne((r) => r.url === `${BASE}/api/catalog/welcome/examples`).flush({
      examples: [
        { id: 'e1', slug: 'e1', title: 'Gorro', imageUrl: null, priceFormatted: '9,90 €', weightGrams: 200 },
      ],
      perArticleDutyFormatted: '3,00 €',
      orderLimitFormatted: '150,00 €',
    });
    const conEjemplos = await ejemplos;
    expect(conEjemplos.ok && conEjemplos.valor.ejemplos[0].titulo).toBe('Gorro');

    const simulacion = guia.simula([{ productId: 'e1', quantity: 2 }]);
    http.expectOne(`${BASE}/api/catalog/welcome/simulate`).flush({
      subtotalFormatted: '19,80 €',
      dutyFormatted: '3,00 €',
      dutyLines: 1,
      shippingFormatted: '5,00 €',
      shippingSubsidyFormatted: '2,00 €',
      shippingNetFormatted: '3,00 €',
      customsSubsidyFormatted: '',
      customsNetFormatted: '3,00 €',
      taxFormatted: '4,00 €',
      totalFormatted: '29,80 €',
      weightGrams: 400,
      overLimit: false,
      orderLimitFormatted: '150,00 €',
    });
    const simulada = await simulacion;
    expect(simulada.ok && simulada.valor.partidas).toBe(1);
  });

  it('el histórico de precios pide los días que se le dicen', async () => {
    const promesa = TestBed.inject(AnaliticaHttpAdapter).historicoDePrecios('p1', 30);
    const peticion = http.expectOne((r) => r.url === `${BASE}/api/catalog/products/p1/price-history`);
    expect(peticion.request.params.get('days')).toBe('30');
    peticion.flush([{ date: '2026-09-01', price: 10, stock: 3 }]);
    const resultado = await promesa;
    expect(resultado.ok && resultado.valor[0].existencias).toBe(3);
  });

  it('publicar una reseña manda solo lo que se ha escrito', async () => {
    void TestBed.inject(ResenasHttpAdapter).publica('p1', {
      valoracion: 5,
      titulo: '',
      cuerpo: 'Bien',
      idioma: 'es',
      autor: '',
    });
    const peticion = http.expectOne(`${BASE}/api/catalog/products/p1/reviews`);
    expect(peticion.request.body).toEqual({
      rating: 5,
      title: undefined,
      body: 'Bien',
      language: 'es',
      authorName: undefined,
    });
    peticion.flush({ id: 'r1', rating: 5 });
  });

  it('la lista de favoritos pide su página', async () => {
    void TestBed.inject(FavoritosHttpAdapter).lista(1, 24);
    const peticion = http.expectOne((r) => r.url === `${BASE}/api/me/favorites`);
    expect(peticion.request.params.get('page')).toBe('1');
    peticion.flush({ items: [], page: 1, size: 24, totalElements: 0, totalPages: 0 });
  });

  /* ── El cierre de la portada ─────────────────────────────────────────────────────────────── */

  it('los países de envío llegan con su código en mayúsculas', async () => {
    const promesa = TestBed.inject(PaisesDeEnvioHttpAdapter).lista();
    http.expectOne((r) => r.url === `${BASE}/api/shipping/countries`).flush([
      { countryCode: 'es', countryName: 'España' },
      { countryCode: 'DE', countryName: 'Alemania' },
    ]);
    const resultado = await promesa;

    expect(resultado.ok && resultado.valor).toEqual([
      { codigo: 'ES', nombre: 'España' },
      { codigo: 'DE', nombre: 'Alemania' },
    ]);
  });

  /** Un país sin nombre saldría en la cinta como una píldora vacía, y eso se lee como una avería. */
  it('las filas sin código o sin nombre se descartan', async () => {
    const promesa = TestBed.inject(PaisesDeEnvioHttpAdapter).lista();
    http.expectOne((r) => r.url === `${BASE}/api/shipping/countries`).flush([
      { countryCode: 'ES', countryName: 'España' },
      { countryCode: 'FR' },
      { countryName: 'Italia' },
    ]);
    const resultado = await promesa;

    expect(resultado.ok && resultado.valor).toHaveLength(1);
  });

  /** Si el backend contesta cualquier otra cosa, sale lista vacía y la sección no se pinta. */
  it('una respuesta que no es lista no revienta la portada', async () => {
    const promesa = TestBed.inject(PaisesDeEnvioHttpAdapter).lista();
    http.expectOne((r) => r.url === `${BASE}/api/shipping/countries`).flush(null);
    const resultado = await promesa;

    expect(resultado.ok && resultado.valor).toEqual([]);
  });

  it('sin red, los países se devuelven como fallo del dominio', async () => {
    const promesa = TestBed.inject(PaisesDeEnvioHttpAdapter).lista();
    http
      .expectOne((r) => r.url === `${BASE}/api/shipping/countries`)
      .error(new ProgressEvent('error'));
    const resultado = await promesa;

    expect(resultado.ok).toBe(false);
  });

  it('el alta en el boletín manda el correo y distingue a quien ya estaba', async () => {
    const promesa = TestBed.inject(AltaEnElBoletinHttpAdapter).suscribe('alguien@nx036.test');
    const peticion = http.expectOne((r) => r.url === `${BASE}/api/newsletter/subscribe`);
    expect(peticion.request.body).toEqual({ email: 'alguien@nx036.test' });
    peticion.flush({ status: 'OK', alreadySubscribed: true });
    const resultado = await promesa;

    expect(resultado.ok && resultado.valor.yaEstaba).toBe(true);
  });

  it('un alta nueva no se anuncia como repetida', async () => {
    const promesa = TestBed.inject(AltaEnElBoletinHttpAdapter).suscribe('otro@nx036.test');
    http
      .expectOne((r) => r.url === `${BASE}/api/newsletter/subscribe`)
      .flush({ status: 'OK', alreadySubscribed: false });
    const resultado = await promesa;

    expect(resultado.ok && resultado.valor.yaEstaba).toBe(false);
  });
});
