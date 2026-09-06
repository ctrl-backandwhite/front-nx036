import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ALMACEN_LOCAL } from '@core/storage/almacen.port';
import { AlmacenMemoriaAdapter } from '@core/storage/almacen-memoria.adapter';
import { TokenStore } from '@core/auth/token-store';
import { DIRECCION_VACIA } from '../domain/model/direccion';
import { PerfilHttpAdapter } from './perfil-http.adapter';
import { DireccionesHttpAdapter } from './direcciones-http.adapter';
import { CobrosHttpAdapter } from './cobros-http.adapter';
import { FacturasHttpAdapter, PlanesHttpAdapter } from './planes-http.adapter';
import { SeguridadHttpAdapter } from './seguridad-http.adapter';

/** La dirección completa que monta `ApiService`: origen vacío en local, más el prefijo del backend. */
const API = '/api';

function prepara() {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: ALMACEN_LOCAL, useClass: AlmacenMemoriaAdapter },
      PerfilHttpAdapter,
      DireccionesHttpAdapter,
      CobrosHttpAdapter,
      PlanesHttpAdapter,
      FacturasHttpAdapter,
      SeguridadHttpAdapter,
    ],
  });
  return TestBed.inject(HttpTestingController);
}

describe('PerfilHttpAdapter', () => {
  let http: HttpTestingController;
  let adaptador: PerfilHttpAdapter;

  beforeEach(() => {
    http = prepara();
    adaptador = TestBed.inject(PerfilHttpAdapter);
  });

  afterEach(() => http.verify());

  it('traduce los datos del perfil al vocabulario del backend', async () => {
    const promesa = adaptador.actualiza({
      nombre: 'Ana',
      primerApellido: 'Pérez',
      segundoApellido: 'García',
      empresa: 'NX036',
      pais: 'ES',
      idioma: 'es',
      telefono: '+34600123456',
    });

    const peticion = http.expectOne(`${API}/me`);
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body).toEqual({
      firstName: 'Ana',
      lastName1: 'Pérez',
      lastName2: 'García',
      companyName: 'NX036',
      country: 'ES',
      language: 'es',
      phone: '+34600123456',
    });
    peticion.flush({});

    expect((await promesa).ok).toBe(true);
  });

  it('un rechazo del servidor llega como error de la aplicación, con su mensaje', async () => {
    const promesa = adaptador.actualiza({
      nombre: '',
      primerApellido: '',
      segundoApellido: '',
      empresa: '',
      pais: '',
      idioma: 'es',
      telefono: 'xxx',
    });
    http
      .expectOne(`${API}/me`)
      .flush({ message: 'Teléfono no válido' }, { status: 422, statusText: 'Unprocessable' });

    const resultado = await promesa;
    expect(resultado.ok).toBe(false);
    expect(resultado.ok ? null : resultado.error.tipo).toBe('peticion-invalida');
    expect(resultado.ok ? null : resultado.error.mensaje).toBe('Teléfono no válido');
  });

  it('el cambio de contraseña viaja con los nombres que espera el backend', async () => {
    const promesa = adaptador.cambiaContrasena({ actual: 'vieja', nueva: 'Abcdef1!' });

    const peticion = http.expectOne(`${API}/me/password`);
    expect(peticion.request.body).toEqual({ currentPassword: 'vieja', newPassword: 'Abcdef1!' });
    peticion.flush({});

    expect((await promesa).ok).toBe(true);
  });

  it('la baja son dos pasos: pedir el código y confirmarlo', async () => {
    const pedir = adaptador.solicita();
    http.expectOne(`${API}/me/delete/request`).flush({});
    expect((await pedir).ok).toBe(true);

    const confirmar = adaptador.confirma('123456');
    const peticion = http.expectOne(`${API}/me/delete/confirm`);
    expect(peticion.request.body).toEqual({ code: '123456' });
    peticion.flush({});
    expect((await confirmar).ok).toBe(true);
  });

  /**
   * La copia de datos se pide con el cliente HTTP para que lleve la credencial: un enlace normal iría
   * sin identificarse y el servidor no lo autorizaría.
   */
  it('la copia de datos se pide como binario y llega con su nombre de fichero', async () => {
    const promesa = adaptador.exporta();

    const peticion = http.expectOne(`${API}/me/data-export`);
    expect(peticion.request.responseType).toBe('blob');
    peticion.flush(new Blob(['{}']));

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor.nombre).toBe('mis-datos.json');
  });

  it('si la copia falla, se devuelve el error y no un fichero vacío', async () => {
    const promesa = adaptador.exporta();
    http.expectOne(`${API}/me/data-export`).flush(null, { status: 500, statusText: 'Error' });

    expect((await promesa).ok).toBe(false);
  });

  /** Si la red falla al avisar, la sesión se cierra IGUAL: dejar a alguien dentro sería peor. */
  it('salir borra las credenciales aunque el servidor no conteste', async () => {
    const tokens = TestBed.inject(TokenStore);
    tokens.guarda('testigo', 'refresco');

    const promesa = adaptador.termina();
    http.expectOne(`${API}/auth/logout`).flush(null, { status: 500, statusText: 'Error' });
    await promesa;

    expect(tokens.acceso()).toBeNull();
  });
});

describe('DireccionesHttpAdapter', () => {
  let http: HttpTestingController;
  let adaptador: DireccionesHttpAdapter;

  beforeEach(() => {
    http = prepara();
    adaptador = TestBed.inject(DireccionesHttpAdapter);
  });

  afterEach(() => http.verify());

  it('traduce la dirección del backend al dominio', async () => {
    const promesa = adaptador.lista();
    http.expectOne(`${API}/me/addresses`).flush([
      {
        id: 'dir-1',
        label: 'Casa',
        fullName: 'Ana',
        phone: '+34600',
        line1: 'Calle',
        line2: '3B',
        city: 'Madrid',
        state: 'M',
        postalCode: '28001',
        country: 'ES',
        default: true,
        createdAt: '2026-01-01T00:00:00Z',
      },
    ]);

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor[0]).toEqual({
      id: 'dir-1',
      etiqueta: 'Casa',
      nombreCompleto: 'Ana',
      telefono: '+34600',
      linea1: 'Calle',
      linea2: '3B',
      ciudad: 'Madrid',
      provincia: 'M',
      codigoPostal: '28001',
      pais: 'ES',
      porDefecto: true,
      creadaEl: '2026-01-01T00:00:00Z',
    });
  });

  it('al crear traduce en la dirección contraria', async () => {
    const promesa = adaptador.crea({ ...DIRECCION_VACIA, nombreCompleto: 'Ana', pais: 'ES', porDefecto: true });

    const peticion = http.expectOne(`${API}/me/addresses`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body.fullName).toBe('Ana');
    expect(peticion.request.body.isDefault).toBe(true);
    peticion.flush({ id: 'dir-1', fullName: 'Ana', line1: '', city: '', country: 'ES', default: true, createdAt: '' });

    expect((await promesa).ok).toBe(true);
  });

  it('actualizar y borrar apuntan a la dirección con su identificador', async () => {
    const actualizar = adaptador.actualiza('dir-1', DIRECCION_VACIA);
    const puesta = http.expectOne(`${API}/me/addresses/dir-1`);
    expect(puesta.request.method).toBe('PUT');
    puesta.flush({ id: 'dir-1', fullName: '', line1: '', city: '', country: '', default: false, createdAt: '' });
    expect((await actualizar).ok).toBe(true);

    const borrar = adaptador.elimina('dir-1');
    const borrada = http.expectOne(`${API}/me/addresses/dir-1`);
    expect(borrada.request.method).toBe('DELETE');
    borrada.flush({});
    expect((await borrar).ok).toBe(true);
  });

  it('las provincias y el formato postal se piden por país', async () => {
    const provincias = adaptador.provincias('US');
    http.expectOne(`${API}/shipping/regions?country=US`).flush([{ code: 'CA', name: 'California' }]);
    expect((await provincias).ok && (await provincias)).toEqual({
      ok: true,
      valor: [{ codigo: 'CA', nombre: 'California' }],
    });

    const formato = adaptador.formatoPostal('ES');
    http
      .expectOne(`${API}/shipping/postal-format?country=ES`)
      .flush({ countryCode: 'ES', required: true, pattern: '\\d{5}', example: '28001' });
    const resultado = await formato;
    expect(resultado.ok && resultado.valor).toEqual({ requerido: true, patron: '\\d{5}', ejemplo: '28001' });
  });
});

describe('CobrosHttpAdapter', () => {
  let http: HttpTestingController;
  let adaptador: CobrosHttpAdapter;

  beforeEach(() => {
    http = prepara();
    adaptador = TestBed.inject(CobrosHttpAdapter);
  });

  afterEach(() => http.verify());

  it('la configuración llega con valores seguros aunque el backend omita campos', async () => {
    const promesa = adaptador.configuracion();
    http.expectOne(`${API}/me/billing/config`).flush({ publishableKey: 'pk_test', enabled: true });

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor).toEqual({
      clavePublicable: 'pk_test',
      activo: true,
      pruebaGratisGastada: false,
    });
  });

  it('traduce el tipo de método al vocabulario del dominio', async () => {
    const promesa = adaptador.lista();
    http.expectOne(`${API}/me/payment-methods`).flush([
      { id: 'pm_1', type: 'CARD', brand: 'visa', last4: '4242', expMonth: 7, expYear: 2028, isDefault: true },
      { id: 'paypal:1', type: 'PAYPAL', paypalEmail: 'a***@nx036.test', isDefault: false },
    ]);

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor.map((m) => m.tipo)).toEqual(['TARJETA', 'PAYPAL']);
    expect(resultado.ok && resultado.valor[0].ultimosCuatro).toBe('4242');
  });

  /** La referencia de PayPal lleva dos puntos: sin escapar, rompería la dirección. */
  it('escapa la referencia del método en la dirección', async () => {
    const promesa = adaptador.marcaPorDefecto('paypal:1');
    http.expectOne(`${API}/me/payment-methods/paypal%3A1/default`).flush({});

    expect((await promesa).ok).toBe(true);
  });

  it('la baja manda el código como parámetro de consulta', async () => {
    const promesa = adaptador.elimina('pm_1', '123456');
    const peticion = http.expectOne(`${API}/me/payment-methods/pm_1?code=123456`);
    expect(peticion.request.method).toBe('DELETE');
    peticion.flush({});

    expect((await promesa).ok).toBe(true);
  });

  it('el alta de tarjeta devuelve el secreto que consume la pasarela', async () => {
    const promesa = adaptador.abreAltaDeTarjeta();
    http.expectOne(`${API}/me/payment-methods/setup-intent`).flush({ clientSecret: 'seti_123' });

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor).toBe('seti_123');
  });

  it('guardar PayPal manda el correo, que se cifra en el servidor', async () => {
    const promesa = adaptador.guardaPaypal('ana@nx036.test');
    const peticion = http.expectOne(`${API}/me/payment-methods/paypal`);
    expect(peticion.request.body).toEqual({ email: 'ana@nx036.test' });
    peticion.flush({});

    expect((await promesa).ok).toBe(true);
  });

  it('pedir el código de baja no borra nada todavía', async () => {
    const promesa = adaptador.pideCodigoDeBaja('pm_1');
    const peticion = http.expectOne(`${API}/me/payment-methods/pm_1/delete-code`);
    expect(peticion.request.method).toBe('POST');
    peticion.flush({});

    expect((await promesa).ok).toBe(true);
  });
});
