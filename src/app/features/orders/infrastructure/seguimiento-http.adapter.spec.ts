import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SeguimientoHttpAdapter } from './seguimiento-http.adapter';

describe('SeguimientoHttpAdapter (comprador)', () => {
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

  it('traduce fase, enlaces y aviso de impuestos del contrato', async () => {
    const promesa = adaptador.consulta('o1');
    http.expectOne('/api/me/orders/o1/tracking').flush({
      carrier: '4PX',
      trackingNumber: 'FPX1',
      phase: 'EN_ADUANA',
      trackingUrl: 'https://track.example/FPX1',
      taxesOnDelivery: true,
      events: [{ status: 'SHIPPED', phase: 'EN_ADUANA', description: 'Despacho' }],
      shipments: [
        {
          sequenceNo: 1,
          weightGrams: 300,
          phase: 'ENTREGADO',
          trackingUrl: 'https://track.example/1',
          proofOfDeliveryUrl: 'https://epod.example/1',
          events: [{ status: 'DELIVERED', phase: 'ENTREGADO' }],
        },
      ],
    });

    const resultado = await promesa;
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.valor.fase).toBe('EN_ADUANA');
    expect(resultado.valor.urlDeSeguimiento).toBe('https://track.example/FPX1');
    expect(resultado.valor.impuestosAlRecibir).toBe(true);
    expect(resultado.valor.hitos[0].fase).toBe('EN_ADUANA');
    expect(resultado.valor.bultos[0].fase).toBe('ENTREGADO');
    expect(resultado.valor.bultos[0].pruebaDeEntregaUrl).toBe('https://epod.example/1');
    expect(resultado.valor.bultos[0].urlDeSeguimiento).toBe('https://track.example/1');
  });

  it('funciona igual que antes si no llega ninguno de los campos nuevos', async () => {
    const promesa = adaptador.consulta('o1');
    http.expectOne('/api/me/orders/o1/tracking').flush({
      trackingNumber: 'LP1',
      events: [{ status: 'SHIPPED', description: 'Salida' }],
      shipments: [{ sequenceNo: 1, weightGrams: 10 }],
    });

    const resultado = await promesa;
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.valor.fase).toBeUndefined();
    expect(resultado.valor.urlDeSeguimiento).toBeUndefined();
    expect(resultado.valor.impuestosAlRecibir).toBe(false);
    expect(resultado.valor.hitos[0].fase).toBeUndefined();
    expect(resultado.valor.bultos[0].fase).toBeUndefined();
    expect(resultado.valor.bultos[0].pruebaDeEntregaUrl).toBeUndefined();
  });

  it('una fase desconocida se toma como ausente en vez de romper el rótulo', async () => {
    const promesa = adaptador.consulta('o1');
    http.expectOne('/api/me/orders/o1/tracking').flush({ phase: 'NUEVA', events: [], shipments: [] });

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor.fase).toBeUndefined();
  });
});
