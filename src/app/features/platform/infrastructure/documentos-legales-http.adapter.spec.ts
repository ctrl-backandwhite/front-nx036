import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DocumentosLegalesHttpAdapter } from './documentos-legales-http.adapter';

describe('DocumentosLegalesHttpAdapter', () => {
  let http: HttpTestingController;
  let adaptador: DocumentosLegalesHttpAdapter;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), DocumentosLegalesHttpAdapter],
    });
    http = TestBed.inject(HttpTestingController);
    adaptador = TestBed.inject(DocumentosLegalesHttpAdapter);
  });

  afterEach(() => http.verify());

  it('pide el documento publicado en el idioma activo', async () => {
    const promesa = adaptador.consulta('privacy', 'pt');

    const peticion = http.expectOne((r) => r.url === '/api/legal/privacy');
    expect(peticion.request.params.get('lang')).toBe('pt');
    peticion.flush({
      docType: 'privacy',
      lang: 'pt',
      title: 'Privacidade',
      body: '{"intro":"","sections":[]}',
      version: '2026-09-01',
    });

    const resultado = await promesa;
    expect(resultado.ok ? resultado.valor.titulo : null).toBe('Privacidade');
    expect(resultado.ok ? resultado.valor.version : null).toBe('2026-09-01');
  });

  it('si el backend no devuelve tipo ni idioma, se conservan los pedidos', async () => {
    const promesa = adaptador.consulta('cookies', 'es');

    http
      .expectOne((r) => r.url === '/api/legal/cookies')
      .flush({ title: 'Cookies', body: '{}', version: 'v1' });

    const resultado = await promesa;
    expect(resultado.ok ? resultado.valor.tipo : null).toBe('cookies');
    expect(resultado.ok ? resultado.valor.idioma : null).toBe('es');
  });

  it('un 404 llega como «no encontrado»', async () => {
    const promesa = adaptador.consulta('withdrawal', 'es');

    http
      .expectOne((r) => r.url === '/api/legal/withdrawal')
      .flush({ message: 'No publicado' }, { status: 404, statusText: 'Not Found' });

    const resultado = await promesa;
    expect(resultado.ok ? null : resultado.error.tipo).toBe('no-encontrado');
  });
});
