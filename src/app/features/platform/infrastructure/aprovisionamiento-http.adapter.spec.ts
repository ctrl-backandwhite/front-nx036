import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AprovisionamientoHttpAdapter } from './aprovisionamiento-http.adapter';

describe('AprovisionamientoHttpAdapter', () => {
  let http: HttpTestingController;
  let adaptador: AprovisionamientoHttpAdapter;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AprovisionamientoHttpAdapter],
    });
    http = TestBed.inject(HttpTestingController);
    adaptador = TestBed.inject(AprovisionamientoHttpAdapter);
  });

  afterEach(() => http.verify());

  it('traduce una solicitud del backend al dominio', async () => {
    const promesa = adaptador.mias();

    http.expectOne('/api/me/sourcing/requests').flush([
      {
        id: 's1',
        sourceUrl: 'https://detail.1688.com/offer/1.html',
        source: '1688',
        status: 'QUOTING',
        titleHint: 'Botella',
        createdAt: '2026-09-01T00:00:00Z',
        quotesCount: 3,
      },
    ]);

    const resultado = await promesa;
    expect(resultado.ok ? resultado.valor[0].urlDeOrigen : null).toBe(
      'https://detail.1688.com/offer/1.html',
    );
    expect(resultado.ok ? resultado.valor[0].cuantasCotizaciones : null).toBe(3);
  });

  it('manda el vocabulario del backend al crear', async () => {
    const promesa = adaptador.crea({
      url: 'https://detail.1688.com/offer/1.html',
      tituloOrientativo: 'Botella',
      notas: 'De acero',
    });

    const peticion = http.expectOne({ method: 'POST', url: '/api/me/sourcing/requests' });
    expect(peticion.request.body).toEqual({
      url: 'https://detail.1688.com/offer/1.html',
      titleHint: 'Botella',
      notes: 'De acero',
    });
    peticion.flush({ id: 's1', sourceUrl: 'x', status: 'PENDING', createdAt: 'x', quotesCount: 0 });

    expect((await promesa).ok).toBe(true);
  });

  it('cancelar y eliminar son operaciones DISTINTAS con rutas distintas', async () => {
    // Cancelar es reversible y deja la solicitud; eliminar la borra. Confundirlas al portar habría
    // hecho que el botón de cancelar destruyera datos.
    const cancelando = adaptador.cancela('s1');
    http
      .expectOne({ method: 'POST', url: '/api/me/sourcing/requests/s1/cancel' })
      .flush({ id: 's1', sourceUrl: 'x', status: 'CANCELLED', createdAt: 'x', quotesCount: 0 });
    expect((await cancelando).ok).toBe(true);

    const eliminando = adaptador.elimina('s1');
    http.expectOne({ method: 'DELETE', url: '/api/me/sourcing/requests/s1' }).flush(null);
    expect((await eliminando).ok).toBe(true);
  });

  it('traduce una cotización con su agente', async () => {
    const promesa = adaptador.deLaSolicitud('s1');

    http.expectOne('/api/me/sourcing/requests/s1/quotes').flush([
      {
        id: 'q1',
        requestId: 's1',
        agent: {
          id: 'a1',
          displayName: 'Wei',
          tier: 'SENIOR',
          // El backend serializa esto como CADENA en algunas rutas: sin `Number`, `toFixed` lanza al
          // pintar la ficha del agente.
          satisfaction: '4.87',
          completedJobs: '120',
        },
        priceUsdCents: 4500,
        etaDays: 12,
        status: 'OPEN',
        createdAt: '2026-09-01T00:00:00Z',
      },
    ]);

    const resultado = await promesa;
    const cotizacion = resultado.ok ? resultado.valor[0] : null;
    expect(cotizacion?.precioEnCentimosUsd).toBe(4500);
    expect(cotizacion?.agente?.satisfaccion).toBe(4.87);
    expect(cotizacion?.agente?.trabajosCompletados).toBe(120);
  });

  it('elegir una cotización lleva los dos identificadores en la dirección', async () => {
    const promesa = adaptador.elige('s1', 'q9');

    http
      .expectOne({ method: 'POST', url: '/api/me/sourcing/requests/s1/select-quote/q9' })
      .flush({ id: 's1', sourceUrl: 'x', status: 'APPROVED', createdAt: 'x', quotesCount: 1 });

    expect((await promesa).ok).toBe(true);
  });

  it('lista los agentes', async () => {
    const promesa = adaptador.lista();

    http
      .expectOne('/api/me/sourcing/agents')
      .flush([{ id: 'a1', displayName: 'Wei', tier: 'MID', satisfaction: 4.2, completedJobs: 8 }]);

    const resultado = await promesa;
    expect(resultado.ok ? resultado.valor[0].nombre : null).toBe('Wei');
  });

  it('un fallo de red llega como AppError sin conexión', async () => {
    const promesa = adaptador.mias();

    http.expectOne('/api/me/sourcing/requests').error(new ProgressEvent('error'));

    const resultado = await promesa;
    expect(resultado.ok).toBe(false);
  });
});
