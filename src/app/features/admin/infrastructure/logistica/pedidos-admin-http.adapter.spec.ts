import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { PedidosAdminHttpAdapter } from './pedidos-admin-http.adapter';

describe('PedidosAdminHttpAdapter', () => {
  let adaptador: PedidosAdminHttpAdapter;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), PedidosAdminHttpAdapter],
    });
    adaptador = TestBed.inject(PedidosAdminHttpAdapter);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('traduce la página del backend al vocabulario del dominio', async () => {
    const promesa = adaptador.busca({ estado: 'PAID', pagina: 1, tamano: 25 });

    const peticion = http.expectOne(
      (r) => r.url === '/api/admin/orders' && r.params.get('status') === 'PAID',
    );
    expect(peticion.request.params.get('page')).toBe('1');
    peticion.flush({
      items: [
        {
          id: 'p1',
          orderNumber: 'NX-1',
          status: 'PAID',
          totalFormatted: '9,54 €',
          itemCount: 2,
          shopHandle: 'mi-tienda',
        },
      ],
      totalElements: 1,
      totalPages: 1,
      page: 1,
    });

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor.pedidos[0]).toEqual({
      id: 'p1',
      numero: 'NX-1',
      estado: 'PAID',
      emailCliente: undefined,
      // Sin nombre comercial se cae al identificador de la tienda, que al menos se reconoce.
      tienda: 'mi-tienda',
      proveedor: undefined,
      articulos: 2,
      totalFormateado: '9,54 €',
      totalCentimos: undefined,
      moneda: undefined,
      realizadoEl: undefined,
    });
  });

  it('una respuesta sin lista no revienta: devuelve una página vacía', async () => {
    const promesa = adaptador.busca({ pagina: 0, tamano: 25 });

    http.expectOne((r) => r.url === '/api/admin/orders').flush({});

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor).toEqual({
      pedidos: [],
      total: 0,
      paginas: 1,
      pagina: 0,
    });
  });

  /** Sin idioma los títulos de línea vuelven en chino, que es como se cargaron. */
  it('la ficha pide el idioma del panel', async () => {
    const promesa = adaptador.ficha('p1', 'fr');

    const peticion = http.expectOne((r) => r.url === '/api/admin/orders/p1');
    expect(peticion.request.params.get('lang')).toBe('fr');
    peticion.flush({ id: 'p1', orderNumber: 'NX-1', status: 'PAID', items: [] });

    expect((await promesa).ok).toBe(true);
  });

  /**
   * Un «0,00 €» de envío se lee como envío gratis, que es una promesa distinta de «por calcular».
   */
  it('deja envío e impuestos SIN valor mientras no se hayan cotizado', async () => {
    const promesa = adaptador.ficha('p1', 'es');

    http.expectOne((r) => r.url === '/api/admin/orders/p1').flush({
      id: 'p1',
      orderNumber: 'NX-1',
      status: 'PAID',
      currency: 'EUR',
      shippingCents: 0,
      taxCents: 0,
      items: [],
    });

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor.envioFormateado).toBeUndefined();
    expect(resultado.ok && resultado.valor.impuestosFormateado).toBeUndefined();
  });

  it('traduce las líneas y el origen del pedido', async () => {
    const promesa = adaptador.ficha('p1', 'es');

    http.expectOne((r) => r.url === '/api/admin/orders/p1').flush({
      id: 'p1',
      orderNumber: 'NX-1',
      status: 'PAID',
      currency: 'EUR',
      source: 'INTEGRATION',
      shippingAddress: { fullName: 'Ana', line1: 'C/ Mayor 1', city: 'Madrid', country: 'ES' },
      items: [
        {
          id: 'l1',
          title: 'Gorro',
          qty: 2,
          unitPriceCents: 500,
          lineTotalCents: 1000,
          productSourceUrl: 'https://1688.test/x',
        },
      ],
    });

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor.origen).toBe('INTEGRATION');
    expect(resultado.ok && resultado.valor.lineas[0].totalLineaFormateado).toBe('10.00 EUR');
    expect(resultado.ok && resultado.valor.direccionDeEnvio?.ciudad).toBe('Madrid');
  });

  it('un origen desconocido se trata como plataforma propia', async () => {
    const promesa = adaptador.ficha('p1', 'es');

    http.expectOne((r) => r.url === '/api/admin/orders/p1').flush({
      id: 'p1',
      orderNumber: 'NX-1',
      status: 'PAID',
      source: 'RARO',
      items: [],
    });

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor.origen).toBe('PLATFORM');
  });

  it('cada transición va a SU ruta', async () => {
    const promesa = adaptador.aplica('p1', 'deliver');

    http.expectOne('/api/admin/orders/p1/deliver').flush({});

    expect((await promesa).ok).toBe(true);
  });

  it('el lote manda la lista de identificadores en el cuerpo', async () => {
    const promesa = adaptador.aplicaEnLote(['a', 'b'], 'cancel');

    const peticion = http.expectOne('/api/admin/orders/bulk-cancel');
    expect(peticion.request.body).toEqual(['a', 'b']);
    peticion.flush({ succeeded: 1, failed: 1, errors: ['b: no se puede'] });

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor).toEqual({
      correctas: 1,
      fallidas: 1,
      errores: ['b: no se puede'],
    });
  });

  /**
   * El backend humaniza sus mensajes; el adaptador solo los traduce a un error de la aplicación para
   * que de aquí para dentro no circule un código de estado.
   */
  it('un 422 con detalle sale como error de petición inválida y con su mensaje', async () => {
    const promesa = adaptador.aplica('p1', 'forward');

    http
      .expectOne('/api/admin/orders/p1/forward')
      .flush({ message: 'falta partida arancelaria (HSCode)' }, { status: 422, statusText: '' });

    const resultado = await promesa;
    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.error.tipo).toBe('peticion-invalida');
    expect(!resultado.ok && resultado.error.mensaje).toBe('falta partida arancelaria (HSCode)');
  });

  /** Al servidor nunca puede llegar una línea de cero unidades. */
  it('el alta aplica el mínimo de una unidad antes de enviar', async () => {
    const promesa = adaptador.crea({
      direccionDeEnvio: {
        nombreCompleto: 'Ana',
        linea1: 'C/ Mayor 1',
        ciudad: 'Madrid',
        pais: 'ES',
      },
      lineas: [{ productoId: 'x', cantidad: 0 }],
    });

    const peticion = http.expectOne('/api/admin/orders');
    expect(peticion.request.body.items[0].quantity).toBe(1);
    expect(peticion.request.body.shippingAddress.fullName).toBe('Ana');
    peticion.flush({});

    expect((await promesa).ok).toBe(true);
  });

  it('la importación envuelve los pedidos y traduce el parte', async () => {
    const promesa = adaptador.importa([
      {
        direccionDeEnvio: {
          nombreCompleto: 'Ana',
          linea1: 'C/ Mayor 1',
          ciudad: 'Madrid',
          pais: 'ES',
        },
        lineas: [{ productoId: 'x', cantidad: 2 }],
      },
    ]);

    const peticion = http.expectOne('/api/admin/orders/import');
    expect(peticion.request.body.orders).toHaveLength(1);
    peticion.flush({ imported: 1, failed: 0, errors: [] });

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor.importados).toBe(1);
  });

  it('el reindexado devuelve cuántos se indexaron, y cero si no lo dice', async () => {
    const promesa = adaptador.reindexa();

    http.expectOne('/api/admin/orders/reindex').flush({});

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor).toBe(0);
  });

  it('el pedido de demostración llama a su ruta', async () => {
    const promesa = adaptador.creaDemostracion();

    http.expectOne('/api/admin/orders/demo').flush({});

    expect((await promesa).ok).toBe(true);
  });
});

describe('lectura del volcado pegado', () => {
  let adaptador: PedidosAdminHttpAdapter;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), PedidosAdminHttpAdapter],
    });
    adaptador = TestBed.inject(PedidosAdminHttpAdapter);
  });

  it('traduce los nombres del backend al vocabulario del dominio', () => {
    const resultado = adaptador.interpreta(
      JSON.stringify([
        {
          customerEmail: 'a@x.test',
          shippingAddress: { fullName: 'Ana', line1: 'C/ Mayor 1', city: 'Madrid', country: 'ES' },
          items: [{ productId: 'x', quantity: 3 }],
        },
      ]),
    );

    expect(resultado.ok && resultado.valor[0].direccionDeEnvio.nombreCompleto).toBe('Ana');
    expect(resultado.ok && resultado.valor[0].lineas[0].cantidad).toBe(3);
  });

  it('un JSON roto se rechaza como problema de formato', () => {
    const resultado = adaptador.interpreta('{ esto no es json');

    expect(resultado.ok || resultado.error).toBe('formato');
  });

  it('una lista vacía o algo que no es lista se rechaza como vacío', () => {
    const vacio = adaptador.interpreta('[]');
    const objeto = adaptador.interpreta('{"a":1}');
    expect(vacio.ok || vacio.error).toBe('vacio');
    expect(objeto.ok || objeto.error).toBe('vacio');
  });

  it('rellena con vacíos lo que el volcado no traiga, en vez de reventar', () => {
    const resultado = adaptador.interpreta('[{}]');

    expect(resultado.ok && resultado.valor[0].direccionDeEnvio.pais).toBe('');
    expect(resultado.ok && resultado.valor[0].lineas).toEqual([]);
  });
});
