import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CarteraHttpAdapter } from './cartera-http.adapter';

describe('CarteraHttpAdapter', () => {
  let adaptador: CarteraHttpAdapter;
  let red: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), CarteraHttpAdapter],
    });
    adaptador = TestBed.inject(CarteraHttpAdapter);
    red = TestBed.inject(HttpTestingController);
  });

  afterEach(() => red.verify());

  it('usa los importes que el backend ya formateó', async () => {
    const promesa = adaptador.consulta();
    red.expectOne('/api/me/wallet').flush({
      id: 'w1',
      holdUsdCents: 500,
      balanceDisplay: 42.5,
      displayCurrency: 'EUR',
      displaySymbol: '€',
      balanceFormatted: '42,50 €',
      balanceUsdFormatted: '$46.00',
      holdUsdFormatted: '$5.00',
    });

    const resultado = await promesa;
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.valor.saldoFormateado).toBe('42,50 €');
      expect(resultado.valor.saldoCanonicoFormateado).toBe('$46.00');
      expect(resultado.valor.retenidoFormateado).toBe('$5.00');
    }
  });

  /** El respaldo da FORMA a la cifra del servidor en su misma moneda: no aplica ningún cambio. */
  it('sin cadena formateada compone con el símbolo y la cifra del propio servidor', async () => {
    const promesa = adaptador.consulta();
    red.expectOne('/api/me/wallet').flush({
      id: 'w1',
      holdUsdCents: 0,
      balanceDisplay: 7,
      displayCurrency: 'USD',
      displaySymbol: '$',
    });

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor.saldoFormateado).toBe('$7.00');
  });

  /** Un «Retenido: 0,00 $» inquieta sin motivo, y hay carteras con retenciones huérfanas antiguas. */
  it('no enseña lo retenido cuando no hay nada retenido', async () => {
    const promesa = adaptador.consulta();
    red.expectOne('/api/me/wallet').flush({
      id: 'w1',
      holdUsdCents: 0,
      balanceDisplay: 0,
      displayCurrency: 'EUR',
      displaySymbol: '€',
      holdUsdFormatted: '$0.00',
    });

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor.retenidoFormateado).toBe('');
  });

  it('trae los movimientos con su signo y su paginación', async () => {
    const promesa = adaptador.movimientos(0, 20);

    const peticion = red.expectOne((r) => r.url === '/api/me/wallet/transactions');
    expect(peticion.request.params.get('size')).toBe('20');
    peticion.flush({
      totalElements: 2,
      items: [
        {
          id: 't1',
          kind: 'DEPOSIT',
          amountUsdCents: 1000,
          balanceAfterCents: 1000,
          createdAt: '2026-09-01T10:00:00Z',
          amountFormatted: '+10,00 €',
          balanceAfterFormatted: '10,00 €',
        },
        {
          id: 't2',
          kind: 'PAYMENT',
          amountUsdCents: -400,
          balanceAfterCents: 600,
          createdAt: '2026-09-02T10:00:00Z',
        },
      ],
    });

    const resultado = await promesa;
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.valor.total).toBe(2);
      expect(resultado.valor.movimientos[0].esEntrada).toBe(true);
      expect(resultado.valor.movimientos[1].esEntrada).toBe(false);
      // El respaldo se escribe en dólares porque los céntimos que llegan SON dólares.
      expect(resultado.valor.movimientos[1].importeFormateado).toBe('$-4.00');
    }
  });

  it('traduce el fallo del servidor a un error de la aplicación', async () => {
    const promesa = adaptador.consulta();
    red.expectOne('/api/me/wallet').flush(null, { status: 500, statusText: 'Server Error' });

    const resultado = await promesa;
    expect(!resultado.ok && resultado.error.tipo).toBe('error-del-servidor');
  });
});
