import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import {
  PerfilHttpAdapter, SegundoFactorHttpAdapter, SesionesHttpAdapter,
} from './perfil-http.adapter';

describe('PerfilHttpAdapter', () => {
  let adaptador: PerfilHttpAdapter;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), PerfilHttpAdapter],
    });
    adaptador = TestBed.inject(PerfilHttpAdapter);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lee la cuenta completa, con lo que la sesión no publica', async () => {
    const promesa = adaptador.lee();

    http.expectOne('/api/me').flush({
      id: 'u1', email: 'ana@nx036.local', role: 'ADMIN', displayName: 'Ana',
      companyName: 'Acme', country: 'ES', language: 'es', createdAt: '2026-01-01',
    });

    const resultado = await promesa;
    if (resultado.ok) {
      expect(resultado.valor.email).toBe('ana@nx036.local');
      expect(resultado.valor.empresa).toBe('Acme');
      expect(resultado.valor.idioma).toBe('es');
      expect(resultado.valor.creadoEl).toBe('2026-01-01');
    }
  });

  /** Un papel ausente se lee como el más bajo: nunca se asciende a nadie por un dato que falta. */
  it('sin papel se lee como USER y sin permisos', async () => {
    const promesa = adaptador.lee();

    http.expectOne('/api/me').flush({ id: 'u1', email: 'a@b.c' });

    const resultado = await promesa;
    if (resultado.ok) {
      expect(resultado.valor.rol).toBe('USER');
      expect(resultado.valor.permisos).toEqual([]);
    }
  });

  it('al guardar manda solo lo que se ha rellenado', async () => {
    const promesa = adaptador.actualiza({ nombreVisible: 'Ana', empresa: '', pais: 'ES' });

    const peticion = http.expectOne('/api/me');
    expect(peticion.request.method).toBe('PUT');
    // Una cadena vacía no es «bórralo»: es que no se tocó, y mandarla pisaría el valor guardado.
    expect(peticion.request.body).toEqual({
      displayName: 'Ana', companyName: undefined, country: 'ES',
    });
    peticion.flush({ id: 'u1', email: 'a@b.c' });

    await promesa;
  });

  it('el cambio de contraseña va por su propio recurso', async () => {
    const promesa = adaptador.cambiaContrasena('vieja', 'nueva');

    const peticion = http.expectOne('/api/me/password');
    expect(peticion.request.body).toEqual({ currentPassword: 'vieja', newPassword: 'nueva' });
    peticion.flush({});

    expect((await promesa).ok).toBe(true);
  });

  it('una contraseña actual equivocada llega como AppError, no como excepción', async () => {
    const promesa = adaptador.cambiaContrasena('mal', 'nueva');

    http.expectOne('/api/me/password')
      .flush({ message: 'La contraseña actual no es correcta' }, { status: 400, statusText: 'Bad Request' });

    const resultado = await promesa;
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error.tipo).toBe('peticion-invalida');
    }
  });
});

describe('SegundoFactorHttpAdapter', () => {
  let adaptador: SegundoFactorHttpAdapter;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), SegundoFactorHttpAdapter],
    });
    adaptador = TestBed.inject(SegundoFactorHttpAdapter);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  /**
   * El secreto y la dirección `otpauth` salen del backend UNA vez y NO viajan a ningún tercero: el
   * código QR se dibuja en el propio navegador. Mandarlos a un servicio de imágenes entrega la semilla
   * del segundo factor a quien sirva esa imagen.
   */
  it('el alta devuelve el secreto y la dirección para dibujar el código', async () => {
    const promesa = adaptador.inicia();

    http.expectOne('/api/me/2fa/setup')
      .flush({ base32Secret: 'ABC123', otpauthUrl: 'otpauth://totp/NX036' });

    const resultado = await promesa;
    if (resultado.ok) {
      expect(resultado.valor).toEqual({ secreto: 'ABC123', urlOtpauth: 'otpauth://totp/NX036' });
    }
  });

  it('verificar devuelve los códigos de respaldo, que solo se enseñan una vez', async () => {
    const promesa = adaptador.verifica('123456');

    const peticion = http.expectOne('/api/me/2fa/verify');
    expect(peticion.request.body).toEqual({ otp: '123456' });
    peticion.flush({ backupCodes: ['aaaa', 'bbbb'] });

    const resultado = await promesa;
    if (resultado.ok) {
      expect(resultado.valor).toEqual(['aaaa', 'bbbb']);
    }
  });

  it('sin códigos de respaldo devuelve una lista vacía, no indefinido', async () => {
    const promesa = adaptador.verifica('123456');

    http.expectOne('/api/me/2fa/verify').flush({});

    const resultado = await promesa;
    if (resultado.ok) {
      expect(resultado.valor).toEqual([]);
    }
  });

  it('el estado se lee como sí o no', async () => {
    const promesa = adaptador.estado();

    http.expectOne('/api/me/2fa/status').flush({ enabled: true });

    expect(await promesa).toEqual({ ok: true, valor: true });
  });

  it('desactivar exige la contraseña y la manda', async () => {
    const promesa = adaptador.desactiva('mi-contrasena');

    const peticion = http.expectOne('/api/me/2fa/disable');
    expect(peticion.request.body).toEqual({ password: 'mi-contrasena' });
    peticion.flush({});

    await promesa;
  });
});

describe('SesionesHttpAdapter', () => {
  let adaptador: SesionesHttpAdapter;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), SesionesHttpAdapter],
    });
    adaptador = TestBed.inject(SesionesHttpAdapter);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('traduce las sesiones abiertas y marca cuál es la de ahora', async () => {
    const promesa = adaptador.lista();

    http.expectOne('/api/me/sessions').flush([
      { id: 's1', device: 'iPhone 15', ip: '1.2.3.4', createdAt: 'a', lastSeenAt: 'b', current: true },
      { id: 's2', createdAt: 'a', lastSeenAt: 'b' },
    ]);

    const resultado = await promesa;
    if (resultado.ok) {
      expect(resultado.valor[0].actual).toBe(true);
      expect(resultado.valor[1].dispositivo).toBe('');
      expect(resultado.valor[1].actual).toBe(false);
    }
  });

  it('revocar una sesión va por su propio recurso', async () => {
    const promesa = adaptador.revoca('s2');

    http.expectOne('/api/me/sessions/s2/revoke').flush({});

    expect((await promesa).ok).toBe(true);
  });
});
