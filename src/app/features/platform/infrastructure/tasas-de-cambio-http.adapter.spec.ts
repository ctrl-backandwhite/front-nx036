import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TasasDeCambioHttpAdapter } from './tasas-de-cambio-http.adapter';

describe('TasasDeCambioHttpAdapter', () => {
  let http: HttpTestingController;
  let adaptador: TasasDeCambioHttpAdapter;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), TasasDeCambioHttpAdapter],
    });
    http = TestBed.inject(HttpTestingController);
    adaptador = TestBed.inject(TasasDeCambioHttpAdapter);
  });

  afterEach(() => http.verify());

  it('traduce la tabla del día a lo mínimo que necesitan estas pantallas', async () => {
    const promesa = adaptador.consulta();

    http.expectOne('/api/currency/rates').flush([
      { code: 'USD', rateVsUsd: 1, symbol: '$', name: 'Dólar' },
      { code: 'EUR', rateVsUsd: 0.92, symbol: '€', name: 'Euro' },
    ]);

    const resultado = await promesa;
    expect(resultado.ok ? resultado.valor : null).toEqual([
      { codigo: 'USD', porDolar: 1 },
      { codigo: 'EUR', porDolar: 0.92 },
    ]);
  });

  it('una tasa de cero o ausente cae a uno en vez de convertir todo a infinito', async () => {
    const promesa = adaptador.consulta();

    http.expectOne('/api/currency/rates').flush([
      { code: 'ZZZ', rateVsUsd: 0 },
      { code: 'YYY' },
    ]);

    const resultado = await promesa;
    expect(resultado.ok ? resultado.valor.map((t) => t.porDolar) : null).toEqual([1, 1]);
  });
});
