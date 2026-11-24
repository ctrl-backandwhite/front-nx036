import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SeguimientoHttpAdapter } from './seguimiento-http.adapter';

describe('SeguimientoHttpAdapter (panel): campos de fase', () => {
  let adaptador: SeguimientoHttpAdapter;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), SeguimientoHttpAdapter],
    });
    adaptador = TestBed.inject(SeguimientoHttpAdapter);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('traduce fase, enlaces, última consulta, etiqueta, coste real e incidencias por bulto', async () => {
    const promesa = adaptador.consulta('o1');
    http.expectOne('/api/admin/orders/o1/tracking').flush({
      phase: 'EN_REPARTO',
      trackingUrl: 'https://t.example/1',
      events: [{ status: 'SHIPPED', phase: 'EN_REPARTO' }],
      shipments: [
        {
          sequenceNo: 1,
          phase: 'INCIDENCIA',
          lastTrackedAt: '2026-11-24T10:00:00Z',
          labelUrl: 'https://e.example/1.pdf',
          actualFreight: { amount: 9.9, currency: 'EUR' },
          openIncidents: 2,
          proofOfDeliveryUrl: 'https://p.example/1',
          events: [{ status: 'SHIPPED', phase: 'INCIDENCIA' }],
        },
      ],
    });

    const resultado = await promesa;
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.valor.fase).toBe('EN_REPARTO');
    expect(resultado.valor.urlDeSeguimiento).toBe('https://t.example/1');
    expect(resultado.valor.eventos[0].fase).toBe('EN_REPARTO');
    expect(resultado.valor.bultos[0]).toMatchObject({
      fase: 'INCIDENCIA',
      ultimaConsultaEl: '2026-11-24T10:00:00Z',
      etiquetaUrl: 'https://e.example/1.pdf',
      costeReal: { importe: 9.9, moneda: 'EUR' },
      incidenciasAbiertas: 2,
      pruebaDeEntregaUrl: 'https://p.example/1',
    });
  });

  it('sin los campos nuevos todo queda sin definir y no se inventa un coste', async () => {
    const promesa = adaptador.consulta('o1');
    http.expectOne('/api/admin/orders/o1/tracking').flush({
      shipments: [{ sequenceNo: 1, actualFreight: {} }],
    });

    const resultado = await promesa;
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.valor.fase).toBeUndefined();
    expect(resultado.valor.bultos[0].costeReal).toBeUndefined();
    expect(resultado.valor.bultos[0].fase).toBeUndefined();
    expect(resultado.valor.bultos[0].incidenciasAbiertas).toBeUndefined();
  });
});
