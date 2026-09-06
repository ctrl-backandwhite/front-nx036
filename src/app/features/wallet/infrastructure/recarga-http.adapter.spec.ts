import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RecargaHttpAdapter } from './recarga-http.adapter';

describe('RecargaHttpAdapter', () => {
  let adaptador: RecargaHttpAdapter;
  let red: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), RecargaHttpAdapter],
    });
    adaptador = TestBed.inject(RecargaHttpAdapter);
    red = TestBed.inject(HttpTestingController);
  });

  afterEach(() => red.verify());

  it('pide los importes sugeridos en la divisa activa', async () => {
    const promesa = adaptador.opciones('EUR');

    const peticion = red.expectOne((r) => r.url === '/api/me/wallet/recharge/options');
    expect(peticion.request.params.get('currency')).toBe('EUR');
    peticion.flush({ currency: 'EUR', symbol: '€', presets: [{ amount: 50, formatted: '50,00 €' }] });

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor.sugeridos[0].formateado).toBe('50,00 €');
  });

  /**
   * El importe viaja en la divisa ACTIVA y es el backend quien deriva el dólar canónico: mandarlo ya
   * convertido significaría dos tipos de cambio distintos para un mismo cobro.
   */
  it('manda el importe en la divisa activa, sin convertir', async () => {
    const promesa = adaptador.inicia({ metodo: 'CARD', divisa: 'EUR', importe: 50 });

    const peticion = red.expectOne('/api/me/wallet/recharge');
    expect(peticion.request.body).toMatchObject({
      method: 'CARD',
      currencyDisplay: 'EUR',
      amountDisplay: 50,
    });
    peticion.flush({
      paymentId: 'p1',
      method: 'CARD',
      status: 'PENDING',
      amountUsdCents: 5400,
      chargeCurrency: 'EUR',
      chargeFormatted: '50,00 €',
      provider: 'stripe',
      approveUrl: 'https://stripe/pay',
    });

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor.urlDeAprobacion).toBe('https://stripe/pay');
  });

  it('la cadena de criptomoneda solo viaja con el método USDT', async () => {
    const promesa = adaptador.inicia({
      metodo: 'PAYPAL',
      divisa: 'EUR',
      importe: 10,
      cadenaCripto: 'TRC20',
    });

    const peticion = red.expectOne('/api/me/wallet/recharge');
    expect(peticion.request.body.cryptoChain).toBeUndefined();
    peticion.flush({
      paymentId: 'p1',
      method: 'PAYPAL',
      status: 'PENDING',
      amountUsdCents: 1000,
      provider: 'paypal',
    });

    const resultado = await promesa;
    // Sin importe de cobro formateado se escribe el canónico en dólares, que es lo que el servidor manda.
    expect(resultado.ok && resultado.valor.importeFormateado).toBe('$10.00');
  });

  it('confirma el cobro de la pasarela', async () => {
    const promesa = adaptador.confirma('p1');
    red.expectOne('/api/me/wallet/recharge/p1/confirm').flush({});
    expect((await promesa).ok).toBe(true);
  });

  it('captura el pago de PayPal', async () => {
    const promesa = adaptador.capturaPaypal('p1');
    red.expectOne('/api/me/wallet/paypal/capture?paymentId=p1').flush({});
    expect((await promesa).ok).toBe(true);
  });

  it('da por bueno el cobro simulado', async () => {
    const promesa = adaptador.confirmaSimulada('p1');
    red.expectOne('/api/me/wallet/confirm-mock?paymentId=p1').flush({});
    expect((await promesa).ok).toBe(true);
  });

  it('traduce el rechazo del cobro a un error de la aplicación', async () => {
    const promesa = adaptador.inicia({ metodo: 'CARD', divisa: 'EUR', importe: 1 });
    red
      .expectOne('/api/me/wallet/recharge')
      .flush({ message: 'Importe fuera de rango' }, { status: 422, statusText: 'Unprocessable' });

    const resultado = await promesa;
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error.tipo).toBe('peticion-invalida');
      expect(resultado.error.mensaje).toBe('Importe fuera de rango');
    }
  });
});
