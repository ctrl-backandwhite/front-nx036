import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EstadoDelServicioHttpAdapter } from './estado-del-servicio-http.adapter';

describe('EstadoDelServicioHttpAdapter', () => {
  let http: HttpTestingController;
  let adaptador: EstadoDelServicioHttpAdapter;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), EstadoDelServicioHttpAdapter],
    });
    http = TestBed.inject(HttpTestingController);
    adaptador = TestBed.inject(EstadoDelServicioHttpAdapter);
  });

  afterEach(() => http.verify());

  it('pincha un endpoint PÚBLICO: la página de estado sirve también a quien no ha entrado', async () => {
    const promesa = adaptador.comprueba();

    http.expectOne('/api/shipping/countries').flush([{ code: 'ES' }]);

    const resultado = await promesa;
    expect(resultado.ok).toBe(true);
    // Se tira la respuesta a propósito: aquí solo interesa si hubo fallo.
    expect(resultado.ok ? resultado.valor : 'algo').toBeUndefined();
  });

  it('un fallo de red se traduce a AppError sin lanzar', async () => {
    const promesa = adaptador.comprueba();

    http.expectOne('/api/shipping/countries').error(new ProgressEvent('error'));

    expect((await promesa).ok).toBe(false);
  });
});
