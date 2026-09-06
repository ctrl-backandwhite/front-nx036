import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PedidosHttpAdapter } from './pedidos-http.adapter';

describe('PedidosHttpAdapter', () => {
  let adaptador: PedidosHttpAdapter;
  let red: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), PedidosHttpAdapter],
    });
    adaptador = TestBed.inject(PedidosHttpAdapter);
    red = TestBed.inject(HttpTestingController);
  });

  afterEach(() => red.verify());

  it('traduce el listado al vocabulario del dominio', async () => {
    const promesa = adaptador.lista();

    red.expectOne('/api/me/orders').flush([
      {
        id: 'o1',
        orderNumber: 'NX-1',
        status: 'PAID',
        paymentMethod: 'CARD',
        cancellable: true,
        totalFormatted: '12,00 €',
        itemCount: 3,
        placedAt: '2026-09-01T10:00:00Z',
      },
    ]);

    const resultado = await promesa;
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.valor[0]).toEqual({
        id: 'o1',
        numero: 'NX-1',
        estado: 'PAID',
        metodoDePago: 'CARD',
        cancelable: true,
        totalFormateado: '12,00 €',
        articulos: 3,
        realizadoEl: '2026-09-01T10:00:00Z',
      });
    }
  });

  it('un listado vacío no revienta', async () => {
    const promesa = adaptador.lista();
    red.expectOne('/api/me/orders').flush(null);

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor).toEqual([]);
  });

  it('pide la ficha con el idioma, para que el título no llegue en chino', async () => {
    const promesa = adaptador.consulta('o1', 'pt');

    const peticion = red.expectOne((r) => r.url === '/api/me/orders/o1');
    expect(peticion.request.params.get('lang')).toBe('pt');
    peticion.flush({
      id: 'o1',
      orderNumber: 'NX-1',
      status: 'DELIVERED',
      totalFormatted: '30,00 €',
      subtotalFormatted: '25,00 €',
      shippingFormatted: '5,00 €',
      taxFormatted: '0,00 €',
      items: [
        {
          id: 'l1',
          productTitle: 'Gorro',
          quantity: 2,
          unitPriceFormatted: '12,50 €',
          lineTotalFormatted: '25,00 €',
        },
      ],
      shippingAddress: { fullName: 'Ana', line1: 'Calle 1', city: 'Madrid', country: 'ES' },
    });

    const resultado = await promesa;
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.valor.lineas[0].titulo).toBe('Gorro');
      expect(resultado.valor.direccionDeEnvio?.nombreCompleto).toBe('Ana');
      expect(resultado.valor.cancelable).toBe(false);
    }
  });

  /**
   * El backend manda «0» cuando no hubo descuento. Una línea «Descuento −0,00 €» hace pensar que se
   * perdió una promoción por el camino.
   */
  it('no enseña el descuento cuando es cero', async () => {
    const promesa = adaptador.consulta('o1', 'es');
    red
      .expectOne((r) => r.url === '/api/me/orders/o1')
      .flush({
        id: 'o1',
        orderNumber: 'NX-1',
        status: 'PAID',
        discount: '0',
        discountFormatted: '0,00 €',
        items: [],
      });

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor.descuentoFormateado).toBe('');
  });

  it('enseña el descuento cuando de verdad lo hubo', async () => {
    const promesa = adaptador.consulta('o1', 'es');
    red
      .expectOne((r) => r.url === '/api/me/orders/o1')
      .flush({
        id: 'o1',
        orderNumber: 'NX-1',
        status: 'PAID',
        discount: '3.5',
        discountFormatted: '3,50 €',
        items: [],
      });

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor.descuentoFormateado).toBe('3,50 €');
  });

  /**
   * Sin importe formateado se deja vacío: la norma del proyecto prohíbe convertir divisas en el
   * navegador, y un número compuesto aquí no coincidiría con lo cobrado.
   */
  it('sin importe formateado no compone ninguna cifra', async () => {
    const promesa = adaptador.lista();
    red.expectOne('/api/me/orders').flush([
      { id: 'o1', orderNumber: 'NX-1', status: 'PAID', itemCount: 1, placedAt: '2026-09-01' },
    ]);

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor[0].totalFormateado).toBe('');
  });

  it('cancela diciendo idioma y destino del reembolso', async () => {
    const promesa = adaptador.cancela('o1', 'es', false);

    const peticion = red.expectOne(
      '/api/me/orders/o1/cancel?lang=es&refundToWallet=false',
    );
    expect(peticion.request.method).toBe('POST');
    peticion.flush({});

    expect((await promesa).ok).toBe(true);
  });

  it('traduce el fallo del servidor a un error de la aplicación', async () => {
    const promesa = adaptador.lista();
    red.expectOne('/api/me/orders').flush(
      { message: 'Sesión caducada' },
      { status: 401, statusText: 'Unauthorized' },
    );

    const resultado = await promesa;
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error.tipo).toBe('no-autenticado');
      expect(resultado.error.mensaje).toBe('Sesión caducada');
    }
  });
});
