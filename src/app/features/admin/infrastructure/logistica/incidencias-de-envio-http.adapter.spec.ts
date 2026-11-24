import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { IncidenciasDeEnvioHttpAdapter } from './incidencias-de-envio-http.adapter';

describe('IncidenciasDeEnvioHttpAdapter', () => {
  let adaptador: IncidenciasDeEnvioHttpAdapter;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), IncidenciasDeEnvioHttpAdapter],
    });
    adaptador = TestBed.inject(IncidenciasDeEnvioHttpAdapter);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('manda transportista, estado y página al SERVIDOR y traduce la página', async () => {
    const promesa = adaptador.busca({
      transportista: 'FOURPX',
      estado: 'OPEN',
      pagina: 2,
      tamano: 25,
    });

    const peticion = http.expectOne((r) => r.url === '/api/admin/shipments/incidents');
    expect(peticion.request.params.get('carrier')).toBe('FOURPX');
    expect(peticion.request.params.get('status')).toBe('OPEN');
    expect(peticion.request.params.get('page')).toBe('2');
    expect(peticion.request.params.get('size')).toBe('25');
    peticion.flush({
      items: [
        {
          id: 7,
          orderId: 'o1',
          orderNumber: 'NX-1',
          shipmentSequenceNo: 2,
          carrier: 'FOURPX',
          trackingNumber: 'FPX1',
          code: 'FPX_Y',
          cause: 'Dirección incompleta',
          ourFault: true,
          status: 'OPEN',
          openedAt: '2026-11-24T10:00:00Z',
        },
      ],
      totalElements: 51,
      totalPages: 3,
      page: 2,
    });

    const resultado = await promesa;
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.valor).toMatchObject({ total: 51, paginas: 3, pagina: 2 });
    expect(resultado.valor.incidencias[0]).toMatchObject({
      id: '7',
      pedidoId: 'o1',
      numeroDePedido: 'NX-1',
      secuenciaDelBulto: 2,
      transportista: 'FOURPX',
      culpaNuestra: true,
      estado: 'OPEN',
    });
  });

  it('sin filtros no manda parámetros vacíos, y tolera la página al estilo Spring', async () => {
    const promesa = adaptador.busca({ pagina: 0, tamano: 25 });

    const peticion = http.expectOne((r) => r.url === '/api/admin/shipments/incidents');
    expect(peticion.request.params.has('carrier')).toBe(false);
    expect(peticion.request.params.has('status')).toBe(false);
    peticion.flush({
      content: [{ id: 'x', status: 'RESOLVED', resolvedBy: 'ana', note: 'Reenviado' }],
      number: 0,
    });

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor.incidencias[0]).toMatchObject({
      estado: 'RESOLVED',
      resueltaPor: 'ana',
      nota: 'Reenviado',
      culpaNuestra: false,
    });
  });

  it('resolver manda la nota', async () => {
    const promesa = adaptador.resuelve('7', 'Dirección corregida');

    const peticion = http.expectOne('/api/admin/shipments/incidents/7/resolve');
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({ note: 'Dirección corregida' });
    peticion.flush({});

    expect((await promesa).ok).toBe(true);
  });

  it('la etiqueta devuelve la dirección', async () => {
    const promesa = adaptador.etiqueta('o1', 2);

    http.expectOne('/api/admin/orders/o1/shipments/2/label').flush({ url: 'https://e.example/1.pdf' });

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor).toBe('https://e.example/1.pdf');
  });

  it('una etiqueta sin dirección es un fallo, no un éxito vacío', async () => {
    const promesa = adaptador.etiqueta('o1', 2);

    http.expectOne('/api/admin/orders/o1/shipments/2/label').flush({});

    const resultado = await promesa;
    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.error.tipo).toBe('no-encontrado');
  });

  it('un fallo del servidor al pedir la etiqueta llega como error', async () => {
    const promesa = adaptador.etiqueta('o1', 2);

    http
      .expectOne('/api/admin/orders/o1/shipments/2/label')
      .flush({ message: 'x' }, { status: 500, statusText: 'Error' });

    expect((await promesa).ok).toBe(false);
  });

  it('anular hace POST a la ruta del contrato', async () => {
    const promesa = adaptador.anula('o1', 2);

    const peticion = http.expectOne('/api/admin/orders/o1/shipments/2/cancel');
    expect(peticion.request.method).toBe('POST');
    peticion.flush(null, { status: 204, statusText: 'No Content' });

    expect((await promesa).ok).toBe(true);
  });
});
