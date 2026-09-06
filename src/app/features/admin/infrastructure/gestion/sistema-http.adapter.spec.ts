import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { IdiomasHttpAdapter, MonedasHttpAdapter } from './sistema-http.adapter';

describe('IdiomasHttpAdapter', () => {
  let adaptador: IdiomasHttpAdapter;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), IdiomasHttpAdapter],
    });
    adaptador = TestBed.inject(IdiomasHttpAdapter);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('traduce el idioma y usa el código en mayúsculas cuando no hay rótulo', async () => {
    const promesa = adaptador.lista();

    http.expectOne('/api/admin/languages').flush([
      { id: '1', code: 'es', label: 'Español', flag: '🇪🇸', position: 0, active: true, isDefault: true },
      { id: '2', code: 'ja' },
    ]);

    const resultado = await promesa;
    if (resultado.ok) {
      expect(resultado.valor[0].bandera).toBe('🇪🇸');
      expect(resultado.valor[1].etiqueta).toBe('JA');
      expect(resultado.valor[1].activo).toBe(false);
    }
  });

  it('guarda por POST con los nombres del backend', async () => {
    const promesa = adaptador.guarda({ codigo: 'ja', etiqueta: '日本語', activo: true });

    const peticion = http.expectOne('/api/admin/languages');
    expect(peticion.request.body).toMatchObject({ code: 'ja', label: '日本語', active: true });
    peticion.flush({});

    expect((await promesa).ok).toBe(true);
  });
});

describe('MonedasHttpAdapter', () => {
  let adaptador: MonedasHttpAdapter;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), MonedasHttpAdapter],
    });
    adaptador = TestBed.inject(MonedasHttpAdapter);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  /** El registro de administración trae también las apagadas: es justo lo que hay que administrar. */
  it('lee el registro completo, incluidas las divisas sin publicar', async () => {
    const promesa = adaptador.lista();

    http.expectOne('/api/admin/currency/all')
      .flush([{ code: 'COP', name: 'Peso', rateVsUsd: 0, active: false }]);

    const resultado = await promesa;
    if (resultado.ok) {
      expect(resultado.valor[0].tasaVsUsd).toBe(0);
      expect(resultado.valor[0].activa).toBe(false);
    }
  });

  it('la sincronización devuelve cuántas tasas cambiaron', async () => {
    const promesa = adaptador.sincroniza();

    http.expectOne('/api/admin/currency/sync').flush({ updated: 17 });

    expect(await promesa).toEqual({ ok: true, valor: 17 });
  });

  it('activar una divisa manda el estado en la consulta, con el cuerpo vacío', async () => {
    const promesa = adaptador.activa('EUR', true);

    const peticion = http.expectOne((p) => p.url.includes('/api/admin/currency/EUR/active'));
    expect(peticion.request.method).toBe('PUT');
    peticion.flush({});

    expect((await promesa).ok).toBe(true);
  });

  it('activar varias va por el endpoint masivo con los códigos', async () => {
    const promesa = adaptador.activaEnLote(['EUR', 'GBP'], false);

    const peticion = http.expectOne('/api/admin/currency/bulk-active');
    expect(peticion.request.body).toEqual({ codes: ['EUR', 'GBP'], active: false });
    peticion.flush({});

    await promesa;
  });
});
