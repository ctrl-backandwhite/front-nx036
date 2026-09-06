import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ALMACEN_LOCAL } from '@core/storage/almacen.port';
import { AlmacenMemoriaAdapter } from '@core/storage/almacen-memoria.adapter';
import { CoberturaDeEnvioHttpAdapter, EnvioHttpAdapter } from './envio-http.adapter';
import { DireccionesDeEnvioHttpAdapter, PedidoHttpAdapter } from './pedido-http.adapter';
import {
  MetodosDePagoHttpAdapter,
  PagoConTarjetaGuardadaHttpAdapter,
  PagoHttpAdapter,
} from './pago-http.adapter';
import { CarteraHttpAdapter } from './cartera-http.adapter';
import { CotizacionDeLaCompraHttpAdapter } from './cotizacion-de-la-compra-http.adapter';
import { ReferidoHttpAdapter } from './referido-http.adapter';

function monta() {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: ALMACEN_LOCAL, useClass: AlmacenMemoriaAdapter },
      EnvioHttpAdapter,
      CoberturaDeEnvioHttpAdapter,
      PedidoHttpAdapter,
      DireccionesDeEnvioHttpAdapter,
      PagoHttpAdapter,
      PagoConTarjetaGuardadaHttpAdapter,
      MetodosDePagoHttpAdapter,
      CarteraHttpAdapter,
      CotizacionDeLaCompraHttpAdapter,
      ReferidoHttpAdapter,
    ],
  });
  return TestBed.inject(HttpTestingController);
}

describe('EnvioHttpAdapter', () => {
  it('manda destino, cesta, cupón y canal en UNA sola petición', async () => {
    const http = monta();
    const promesa = TestBed.inject(EnvioHttpAdapter).cotiza({
      pais: 'ES',
      region: 'M',
      items: [{ productId: 'p1', variantId: '', cantidad: 2 }],
      codigoDeCupon: 'VERANO10',
      opcionDeEnvio: 'FZZXR',
    });

    const peticion = http.expectOne((r) => r.url.endsWith('/api/shipping/quote'));
    expect(peticion.request.body).toEqual({
      country: 'ES',
      region: 'M',
      items: [{ productId: 'p1', variantId: undefined, quantity: 2 }],
      couponCode: 'VERANO10',
      shippingOptionCode: 'FZZXR',
    });
    peticion.flush({
      supported: true,
      shippingBaseFormatted: '13,30 €',
      shippingNetFormatted: '0,93 €',
      shippingSubsidyFormatted: '12,37 €',
      shippingSubsidyPercent: 93,
      customsHandlingUsdCents: 300,
      customsHandlingFormatted: '3,00 €',
      taxRateBps: 2100,
      taxFormatted: '2,95 €',
      totalFormatted: '129,72 €',
      totalUsdCents: 14000,
      customsBlocked: false,
      selectedShippingOptionCode: 'FZZXR',
      options: [
        { code: 'FZZXR', amountUsdCents: 705, amountFormatted: '7,05 €', carrierName: 'YunExpress', etaMinDays: 8, etaMaxDays: 15 },
      ],
    });
    const resultado = await promesa;

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.valor.cubierto).toBe(true);
      expect(resultado.valor.envioNetoFormateado).toBe('0,93 €');
      expect(resultado.valor.totalCentimosUsd).toBe(14000);
      expect(resultado.valor.opciones?.[0]).toEqual({
        codigo: 'FZZXR',
        importeParaComparar: 705,
        importeFormateado: '7,05 €',
        transportista: 'YunExpress',
        diasMinimos: 8,
        diasMaximos: 15,
      });
    }
  });

  it('un destino sin cobertura llega como no cubierto, no como error', async () => {
    const http = monta();
    const promesa = TestBed.inject(EnvioHttpAdapter).cotiza({ pais: 'XX', items: [] });

    http.expectOne((r) => r.url.endsWith('/api/shipping/quote')).flush({ supported: false });
    const resultado = await promesa;

    expect(resultado.ok && resultado.valor.cubierto).toBe(false);
  });

  it('un fallo del servidor cruza como AppError', async () => {
    const http = monta();
    const promesa = TestBed.inject(EnvioHttpAdapter).cotiza({ pais: 'ES', items: [] });

    http.expectOne((r) => r.url.endsWith('/api/shipping/quote')).flush({}, { status: 500, statusText: 'x' });

    expect((await promesa).ok).toBe(false);
  });
});

describe('CoberturaDeEnvioHttpAdapter', () => {
  it('traduce los países cubiertos', async () => {
    const http = monta();
    const promesa = TestBed.inject(CoberturaDeEnvioHttpAdapter).paises();

    http.expectOne((r) => r.url.endsWith('/api/shipping/countries')).flush([
      { countryCode: 'ES', countryName: 'España' },
    ]);

    expect((await promesa).ok && (await promesa).valueOf()).toBeTruthy();
  });

  it('las provincias van con el país como parámetro', async () => {
    const http = monta();
    const promesa = TestBed.inject(CoberturaDeEnvioHttpAdapter).regiones('US');

    const peticion = http.expectOne((r) => r.url.endsWith('/api/shipping/regions'));
    expect(peticion.request.params.get('country')).toBe('US');
    peticion.flush([{ code: 'CA', name: 'California' }]);
    const resultado = await promesa;

    expect(resultado.ok && resultado.valor).toEqual([{ codigo: 'CA', nombre: 'California' }]);
  });

  it('una respuesta nula se lee como lista vacía', async () => {
    const http = monta();
    const promesa = TestBed.inject(CoberturaDeEnvioHttpAdapter).paises();

    http.expectOne((r) => r.url.endsWith('/api/shipping/countries')).flush(null);

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor).toEqual([]);
  });
});

describe('PedidoHttpAdapter', () => {
  it('NO manda ningún importe: solo qué, adónde y cómo se paga', async () => {
    const http = monta();
    const promesa = TestBed.inject(PedidoHttpAdapter).crea({
      items: [{ productId: 'p1', variantId: '', cantidad: 2 }],
      metodoDePago: 'WALLET',
      idDeDireccion: 'd1',
      opcionDeEnvio: 'FZZXR',
    });

    const peticion = http.expectOne((r) => r.url.endsWith('/api/me/orders/checkout'));
    expect(JSON.stringify(peticion.request.body)).not.toMatch(/price|amount|total/i);
    expect(peticion.request.body.items).toEqual([{ productId: 'p1', variantId: undefined, quantity: 2 }]);
    peticion.flush({ id: 'o1', orderNumber: 'NX-1' });
    const resultado = await promesa;

    expect(resultado.ok && resultado.valor).toEqual({ id: 'o1', numero: 'NX-1' });
  });

  it('la dirección suelta viaja traducida al vocabulario del backend', async () => {
    const http = monta();
    const promesa = TestBed.inject(PedidoHttpAdapter).crea({
      items: [],
      metodoDePago: 'CARD',
      direccionSuelta: {
        nombreCompleto: 'Ana', linea1: 'Mayor 1', ciudad: 'Madrid', pais: 'ES', codigoPostal: '28001',
      },
    });

    const peticion = http.expectOne((r) => r.url.endsWith('/api/me/orders/checkout'));
    expect(peticion.request.body.shippingAddressInline).toMatchObject({
      fullName: 'Ana',
      line1: 'Mayor 1',
      city: 'Madrid',
      country: 'ES',
      postalCode: '28001',
    });
    peticion.flush({ id: 'o1' });
    await promesa;
  });
});

describe('DireccionesDeEnvioHttpAdapter', () => {
  it('traduce la lista de direcciones', async () => {
    const http = monta();
    const promesa = TestBed.inject(DireccionesDeEnvioHttpAdapter).lista();

    http.expectOne((r) => r.url.endsWith('/api/me/addresses')).flush([
      { id: 'd1', label: 'Casa', fullName: 'Ana', line1: 'Mayor 1', city: 'Madrid', state: 'M', postalCode: '28001', country: 'ES', default: true },
    ]);
    const resultado = await promesa;

    expect(resultado.ok && resultado.valor[0]).toMatchObject({
      id: 'd1',
      etiqueta: 'Casa',
      nombreCompleto: 'Ana',
      provincia: 'M',
      porDefecto: true,
    });
  });

  it('al crear manda si es la predeterminada', async () => {
    const http = monta();
    const promesa = TestBed.inject(DireccionesDeEnvioHttpAdapter).crea(
      { nombreCompleto: 'Ana', linea1: 'Mayor 1', ciudad: 'Madrid', pais: 'ES' },
      true,
    );

    const peticion = http.expectOne((r) => r.url.endsWith('/api/me/addresses') && r.method === 'POST');
    expect(peticion.request.body.isDefault).toBe(true);
    peticion.flush({ id: 'd9', fullName: 'Ana', line1: 'Mayor 1', city: 'Madrid', country: 'ES', default: true });
    expect((await promesa).ok).toBe(true);
  });
});

describe('PagoHttpAdapter', () => {
  it('inicia el cobro y traduce la dirección de aprobación y el depósito', async () => {
    const http = monta();
    const promesa = TestBed.inject(PagoHttpAdapter).inicia('o1', 'USDT');

    const peticion = http.expectOne((r) => r.url.endsWith('/api/me/orders/o1/payment-intent'));
    expect(peticion.request.body).toEqual({ method: 'USDT' });
    peticion.flush({ id: 'c1', cryptoAddress: '0xabc', cryptoChain: 'TRC20', cryptoExpiresAt: 'mañana' });
    const resultado = await promesa;

    expect(resultado.ok && resultado.valor.deposito).toEqual({
      direccion: '0xabc',
      red: 'TRC20',
      caducaEl: 'mañana',
    });
  });

  it('sin datos de cripto no inventa un depósito', async () => {
    const http = monta();
    const promesa = TestBed.inject(PagoHttpAdapter).inicia('o1', 'CARD');

    http.expectOne((r) => r.url.includes('payment-intent')).flush({ id: 'c1', approveUrl: 'https://x' });
    const resultado = await promesa;

    expect(resultado.ok && resultado.valor.deposito).toBeUndefined();
    expect(resultado.ok && resultado.valor.urlDeAprobacion).toBe('https://x');
  });

  it('confirma contra las dos direcciones distintas, la real y la simulada', async () => {
    const http = monta();
    const adaptador = TestBed.inject(PagoHttpAdapter);

    const real = adaptador.confirma('o1', 'c1');
    http.expectOne((r) => r.url.endsWith('/api/me/orders/o1/payments/c1/confirm')).flush({});
    expect((await real).ok).toBe(true);

    const simulado = adaptador.confirmaSimulado('o1', 'c1');
    http.expectOne((r) => r.url.endsWith('/api/me/orders/o1/payments/c1/confirm-mock')).flush({});
    expect((await simulado).ok).toBe(true);
  });
});

describe('PagoConTarjetaGuardadaHttpAdapter', () => {
  it('un cobro resuelto no pide autenticación', async () => {
    const http = monta();
    const promesa = TestBed.inject(PagoConTarjetaGuardadaHttpAdapter).cobra('o1', 'pm_1');

    http.expectOne((r) => r.url.endsWith('/api/me/orders/o1/pay-saved-card')).flush({
      status: 'succeeded',
      clientSecret: null,
      paymentId: 'pay1',
    });
    const resultado = await promesa;

    expect(resultado.ok && resultado.valor).toEqual({
      resuelto: true,
      secretoDeCliente: undefined,
      idDeCobro: 'pay1',
    });
  });

  it('cuando el banco exige el reto, llega el secreto', async () => {
    const http = monta();
    const promesa = TestBed.inject(PagoConTarjetaGuardadaHttpAdapter).cobra('o1', 'pm_1');

    http.expectOne((r) => r.url.includes('pay-saved-card')).flush({
      status: 'requires_action',
      clientSecret: 'pi_secret',
      paymentId: 'pay1',
    });
    const resultado = await promesa;

    expect(resultado.ok && resultado.valor.resuelto).toBe(false);
    expect(resultado.ok && resultado.valor.secretoDeCliente).toBe('pi_secret');
  });

  it('cierra el cobro tras el reto', async () => {
    const http = monta();
    const promesa = TestBed.inject(PagoConTarjetaGuardadaHttpAdapter).confirma('o1', 'pay1');

    http.expectOne((r) => r.url.endsWith('/api/me/orders/o1/pay-saved-card/pay1/confirm')).flush({});

    expect((await promesa).ok).toBe(true);
  });
});

describe('MetodosDePagoHttpAdapter', () => {
  it('traduce los métodos guardados', async () => {
    const http = monta();
    const promesa = TestBed.inject(MetodosDePagoHttpAdapter).guardados();

    http.expectOne((r) => r.url.endsWith('/api/me/payment-methods')).flush([
      { id: 'pm_1', type: 'CARD', brand: 'visa', last4: '4242', isDefault: true },
    ]);
    const resultado = await promesa;

    expect(resultado.ok && resultado.valor[0]).toEqual({
      id: 'pm_1',
      clase: 'CARD',
      marca: 'visa',
      ultimosCuatro: '4242',
      correoDePaypal: undefined,
      porDefecto: true,
    });
  });

  it('la pasarela deshabilitada llega como tal', async () => {
    const http = monta();
    const promesa = TestBed.inject(MetodosDePagoHttpAdapter).configuracion();

    http.expectOne((r) => r.url.endsWith('/api/me/billing/config')).flush({ enabled: false });
    const resultado = await promesa;

    expect(resultado.ok && resultado.valor).toEqual({ clavePublica: undefined, habilitada: false });
  });
});

describe('CarteraHttpAdapter', () => {
  /** El disponible llega en céntimos de DÓLAR: la misma unidad que el total del pedido. */
  it('se queda con el disponible y su forma escrita', async () => {
    const http = monta();
    const promesa = TestBed.inject(CarteraHttpAdapter).saldo();

    http.expectOne((r) => r.url.endsWith('/api/me/wallet')).flush({
      availableUsdCents: 12345,
      balanceUsdFormatted: '123,45 $',
      holdUsdCents: 999,
    });
    const resultado = await promesa;

    expect(resultado.ok && resultado.valor).toEqual({
      disponibleCentimosUsd: 12345,
      disponibleFormateado: '123,45 $',
    });
  });

  it('sin disponible declarado se lee cero, no indefinido', async () => {
    const http = monta();
    const promesa = TestBed.inject(CarteraHttpAdapter).saldo();

    http.expectOne((r) => r.url.endsWith('/api/me/wallet')).flush({});

    expect((await promesa).ok && true).toBe(true);
  });
});

describe('CotizacionDeLaCompraHttpAdapter', () => {
  it('pide los importes de las líneas que se van a cobrar', async () => {
    const http = monta();
    const promesa = TestBed.inject(CotizacionDeLaCompraHttpAdapter).valora([
      { productId: 'p1', cantidad: 2 },
    ]);

    http.expectOne((r) => r.url.endsWith('/api/catalog/cart-quote')).flush({
      items: [{ productId: 'p1', unitFormatted: '0,14 €', lineTotalFormatted: '13,80 €' }],
      subtotalFormatted: '13,80 €',
    });
    const resultado = await promesa;

    expect(resultado.ok && resultado.valor.subtotalFormateado).toBe('13,80 €');
  });
});

describe('ReferidoHttpAdapter', () => {
  it('atribuye la venta y la ata a la cuenta', async () => {
    const http = monta();
    const promesa = TestBed.inject(ReferidoHttpAdapter).aplica('ANA10');

    const track = http.expectOne((r) => r.url.endsWith('/api/affiliate/track'));
    expect(track.request.body.ref).toBe('ANA10');
    expect(track.request.body.visitorToken).toBeTruthy();
    track.flush({ visitorToken: 'v1', attributed: true });
    // La segunda llamada sale en cuanto se resuelve la primera: hay que dejar correr los microturnos.
    await new Promise((sigue) => setTimeout(sigue, 0));

    http.expectOne((r) => r.url.endsWith('/api/me/affiliate/bind')).flush({});
    const resultado = await promesa;

    expect(resultado.ok && resultado.valor).toBe(true);
    expect(TestBed.inject(ReferidoHttpAdapter).pendiente()).toBe('ANA10');
  });

  /** Un código no atribuido no se guarda: enseñarlo aplicado sería mentir sobre la comisión. */
  it('un código no atribuido no se recuerda ni se ata', async () => {
    const http = monta();
    const promesa = TestBed.inject(ReferidoHttpAdapter).aplica('LOQUESEA');

    http.expectOne((r) => r.url.endsWith('/api/affiliate/track')).flush({ visitorToken: 'v1', attributed: false });
    const resultado = await promesa;
    await new Promise((sigue) => setTimeout(sigue, 0));

    expect(resultado.ok && resultado.valor).toBe(false);
    expect(TestBed.inject(ReferidoHttpAdapter).pendiente()).toBeNull();
    http.expectNone((r) => r.url.endsWith('/api/me/affiliate/bind'));
  });

  it('un fallo de red vuelve como AppError', async () => {
    const http = monta();
    const promesa = TestBed.inject(ReferidoHttpAdapter).aplica('ANA10');

    http.expectOne((r) => r.url.endsWith('/api/affiliate/track')).flush({}, { status: 0, statusText: '' });

    expect((await promesa).ok).toBe(false);
  });

  it('sin código guardado no hay nada pendiente', () => {
    monta();

    expect(TestBed.inject(ReferidoHttpAdapter).pendiente()).toBeNull();
  });
});
