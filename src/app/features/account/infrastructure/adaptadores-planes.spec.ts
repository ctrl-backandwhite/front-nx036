import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ALMACEN_LOCAL } from '@core/storage/almacen.port';
import { AlmacenMemoriaAdapter } from '@core/storage/almacen-memoria.adapter';
import { FacturasHttpAdapter, PlanesHttpAdapter } from './planes-http.adapter';
import { SeguridadHttpAdapter } from './seguridad-http.adapter';

const API = '/api';

function prepara() {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: ALMACEN_LOCAL, useClass: AlmacenMemoriaAdapter },
      PlanesHttpAdapter,
      FacturasHttpAdapter,
      SeguridadHttpAdapter,
    ],
  });
  return TestBed.inject(HttpTestingController);
}

describe('PlanesHttpAdapter', () => {
  let http: HttpTestingController;
  let adaptador: PlanesHttpAdapter;

  beforeEach(() => {
    http = prepara();
    adaptador = TestBed.inject(PlanesHttpAdapter);
  });

  afterEach(() => http.verify());

  it('traduce el plan del backend al dominio, con los importes ya formateados por él', async () => {
    const promesa = adaptador.lista();
    http.expectOne(`${API}/billing/plans`).flush([
      {
        id: 'plan-pro',
        code: 'PRO',
        name: 'Pro',
        description: 'Para vender en serio',
        priceMonthlyCents: 2900,
        priceYearlyCents: 29000,
        displayMonthlyFormatted: '29,00 €',
        displayYearlyFormatted: '290,00 €',
        position: 3,
        limits: { products: 1000 },
      },
    ]);

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor[0]).toEqual({
      id: 'plan-pro',
      codigo: 'PRO',
      nombre: 'Pro',
      descripcion: 'Para vender en serio',
      centimosMensuales: 2900,
      centimosAnuales: 29000,
      precioMensualFormateado: '29,00 €',
      precioAnualFormateado: '290,00 €',
      posicion: 3,
      limites: { products: 1000 },
    });
  });

  it('un plan sin límites llega con la lista vacía, no con un indefinido', async () => {
    const promesa = adaptador.lista();
    http.expectOne(`${API}/billing/plans`).flush([
      { id: 'p', code: 'FREE', name: 'Gratis', priceMonthlyCents: 0, priceYearlyCents: 0, position: 1 },
    ]);

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor[0].limites).toEqual({});
  });

  /** Sin suscripción el backend responde 204 con el cuerpo vacío: no es un error, es «no hay plan». */
  it('sin suscripción devuelve nulo y no un fallo', async () => {
    const promesa = adaptador.suscripcionActual();
    http.expectOne(`${API}/me/subscription`).flush(null, { status: 204, statusText: 'No Content' });

    const resultado = await promesa;
    expect(resultado.ok).toBe(true);
    expect(resultado.ok && resultado.valor).toBeNull();
  });

  it('traduce la suscripción vigente', async () => {
    const promesa = adaptador.suscripcionActual();
    http.expectOne(`${API}/me/subscription`).flush({
      planId: 'plan-pro',
      status: 'ACTIVE',
      billingPeriod: 'MONTHLY',
      currentPeriodEnd: '2026-10-01',
      pendingPlanCode: 'BASIC',
      pendingPlanAt: '2026-10-01',
    });

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor).toEqual({
      idPlan: 'plan-pro',
      estado: 'ACTIVE',
      periodoDeFacturacion: 'MONTHLY',
      finDelPeriodo: '2026-10-01',
      cancelaEl: undefined,
      planPendiente: 'BASIC',
      planPendienteEl: '2026-10-01',
    });
  });

  /** El dominio habla de periodicidad en español; el backend, en inglés. La traducción vive aquí. */
  it('traduce la periodicidad al contratar', async () => {
    const promesa = adaptador.contrata('PRO', 'ANUAL');
    const peticion = http.expectOne(`${API}/me/subscription`);
    expect(peticion.request.body).toEqual({ planCode: 'PRO', period: 'YEARLY' });
    peticion.flush({ subscriptionId: 's-1', status: 'active' });

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor).toBe('active');
  });

  it('el mensual viaja como MONTHLY', async () => {
    const promesa = adaptador.contrata('PRO', 'MENSUAL');
    const peticion = http.expectOne(`${API}/me/subscription`);
    expect(peticion.request.body.period).toBe('MONTHLY');
    peticion.flush({ subscriptionId: 's-1', status: 'active' });
    await promesa;
  });

  it('cancelar llama a su propia ruta', async () => {
    const promesa = adaptador.cancela();
    http.expectOne(`${API}/me/subscription/cancel`).flush({});

    expect((await promesa).ok).toBe(true);
  });

  it('el fallo del servidor al contratar llega con su código, que la pantalla usa para reaccionar', async () => {
    const promesa = adaptador.contrata('PRO', 'MENSUAL');
    http
      .expectOne(`${API}/me/subscription`)
      .flush({ message: 'Hace falta tarjeta', code: 'PLAN_CARD_REQUIRED' }, { status: 422, statusText: 'x' });

    const resultado = await promesa;
    expect(resultado.ok ? null : resultado.error.codigo).toBe('PLAN_CARD_REQUIRED');
  });
});

describe('FacturasHttpAdapter', () => {
  let http: HttpTestingController;
  let adaptador: FacturasHttpAdapter;

  beforeEach(() => {
    http = prepara();
    adaptador = TestBed.inject(FacturasHttpAdapter);
  });

  afterEach(() => http.verify());

  /**
   * Se guarda el importe YA formateado y no el total en crudo: es la unidad mínima de su divisa, y
   * dividirlo entre cien enseñaría las facturas en yenes cien veces más baratas de lo que se cobró.
   */
  it('se queda con el importe formateado por el backend', async () => {
    const promesa = adaptador.lista();
    http
      .expectOne(`${API}/me/billing/invoices`)
      .flush([{ number: 'F-1', total: 2900, currency: 'EUR', totalFormatted: '29,00 €', status: 'paid', created: 1767225600 }]);

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor[0]).toEqual({
      numero: 'F-1',
      totalFormateado: '29,00 €',
      estado: 'paid',
      creadaEl: 1767225600,
    });
  });

  it('la factura se baja como binario, con NUESTRO diseño y su nombre', async () => {
    const promesa = adaptador.descarga('F/1');

    const peticion = http.expectOne(`${API}/me/billing/invoices/F%2F1/invoice.pdf`);
    expect(peticion.request.responseType).toBe('blob');
    peticion.flush(new Blob(['%PDF']));

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor.nombre).toBe('factura-F/1.pdf');
  });

  it('si la factura no existe, se devuelve el error', async () => {
    const promesa = adaptador.descarga('F-9');
    http
      .expectOne(`${API}/me/billing/invoices/F-9/invoice.pdf`)
      .flush(null, { status: 404, statusText: 'Not Found' });

    expect((await promesa).ok).toBe(false);
  });
});

describe('SeguridadHttpAdapter', () => {
  let http: HttpTestingController;
  let adaptador: SeguridadHttpAdapter;

  beforeEach(() => {
    http = prepara();
    adaptador = TestBed.inject(SeguridadHttpAdapter);
  });

  afterEach(() => http.verify());

  it('dice si el segundo factor está puesto', async () => {
    const promesa = adaptador.estaActivo();
    http.expectOne(`${API}/me/2fa/status`).flush({ enabled: true });

    expect((await promesa).ok && (await promesa)).toEqual({ ok: true, valor: true });
  });

  it('el alta trae la semilla y la dirección que se convierte en código QR', async () => {
    const promesa = adaptador.inicia();
    http
      .expectOne(`${API}/me/2fa/setup`)
      .flush({ base32Secret: 'ABC', otpauthUrl: 'otpauth://totp/NX036' });

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor).toEqual({ secreto: 'ABC', urlOtpauth: 'otpauth://totp/NX036' });
  });

  it('verificar devuelve los códigos de respaldo, o una lista vacía si no vinieron', async () => {
    const conCodigos = adaptador.verifica('123456');
    const peticion = http.expectOne(`${API}/me/2fa/verify`);
    expect(peticion.request.body).toEqual({ otp: '123456' });
    peticion.flush({ backupCodes: ['aaa'] });
    expect((await conCodigos).ok && (await conCodigos)).toEqual({ ok: true, valor: ['aaa'] });

    const sinCodigos = adaptador.verifica('123456');
    http.expectOne(`${API}/me/2fa/verify`).flush({});
    const resultado = await sinCodigos;
    expect(resultado.ok && resultado.valor).toEqual([]);
  });

  it('desactivar manda la contraseña, que es lo que lo protege', async () => {
    const promesa = adaptador.desactiva('secreta');
    const peticion = http.expectOne(`${API}/me/2fa/disable`);
    expect(peticion.request.body).toEqual({ password: 'secreta' });
    peticion.flush({});

    expect((await promesa).ok).toBe(true);
  });

  it('traduce las sesiones activas', async () => {
    const promesa = adaptador.lista();
    http.expectOne(`${API}/me/sessions`).flush([
      { id: 's-1', device: 'iPhone', ip: '1.2.3.4', createdAt: 'a', lastSeenAt: 'b', current: true },
    ]);

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor[0]).toEqual({
      id: 's-1',
      dispositivo: 'iPhone',
      ip: '1.2.3.4',
      creadaEl: 'a',
      ultimoUsoEl: 'b',
      actual: true,
    });
  });

  it('una lista nula del servidor no revienta: llega vacía', async () => {
    const promesa = adaptador.lista();
    http.expectOne(`${API}/me/sessions`).flush(null);

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor).toEqual([]);
  });

  it('revocar apunta a la sesión concreta', async () => {
    const promesa = adaptador.revoca('s-1');
    http.expectOne(`${API}/me/sessions/s-1/revoke`).flush({});

    expect((await promesa).ok).toBe(true);
  });
});
