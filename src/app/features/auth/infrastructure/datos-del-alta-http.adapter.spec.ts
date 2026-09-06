import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatosDelAltaHttpAdapter } from './datos-del-alta-http.adapter';

describe('DatosDelAltaHttpAdapter', () => {
  let adaptador: DatosDelAltaHttpAdapter;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), DatosDelAltaHttpAdapter],
    });
    adaptador = TestBed.inject(DatosDelAltaHttpAdapter);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('traduce los países de envío al vocabulario del dominio', async () => {
    const promesa = adaptador.consulta();
    http.expectOne('/api/shipping/countries').flush([
      { countryCode: 'ES', countryName: 'España' },
    ]);

    const resultado = await promesa;
    expect(resultado).toEqual({ ok: true, valor: [{ codigo: 'ES', nombre: 'España' }] });
  });

  it('cuenta las divisas activas en vez de devolver la lista entera', async () => {
    const promesa = adaptador.cuantas();
    http.expectOne('/api/currency/rates').flush([{ code: 'EUR' }, { code: 'USD' }]);

    expect(await promesa).toEqual({ ok: true, valor: 2 });
  });

  it('normaliza el país del visitante a dos letras mayúsculas', async () => {
    const promesa = adaptador.paisDelVisitante();
    http.expectOne('/api/geo').flush({ country: 'es' });

    expect(await promesa).toEqual({ ok: true, valor: 'ES' });
  });

  it('descarta un país que no tenga forma de código ISO', async () => {
    const promesa = adaptador.paisDelVisitante();
    http.expectOne('/api/geo').flush({ country: 'ESPAÑA' });

    expect(await promesa).toEqual({ ok: true, valor: null });
  });

  it('convierte el fallo en un error del dominio en vez de lanzar', async () => {
    const promesa = adaptador.consulta();
    http.expectOne('/api/shipping/countries').error(new ProgressEvent('error'));

    const resultado = await promesa;
    expect(resultado.ok).toBe(false);
  });
});
