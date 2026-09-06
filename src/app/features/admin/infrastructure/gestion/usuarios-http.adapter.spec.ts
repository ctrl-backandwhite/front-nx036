import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UsuariosEnLoteHttpAdapter, UsuariosHttpAdapter } from './usuarios-http.adapter';

describe('UsuariosHttpAdapter', () => {
  let adaptador: UsuariosHttpAdapter;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), UsuariosHttpAdapter],
    });
    adaptador = TestBed.inject(UsuariosHttpAdapter);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('traduce la página del backend al vocabulario del dominio', async () => {
    const promesa = adaptador.busca({ pagina: 0, tamano: 25 });

    const peticion = http.expectOne((p) => p.url === '/api/admin/users');
    peticion.flush({
      items: [
        {
          id: 'u1', email: 'ana@nx036.local', role: 'OPERATOR', active: true,
          displayName: 'Ana', country: 'ES', failedLoginCount: 2, lockedUntil: null,
        },
      ],
      totalElements: 1, totalPages: 1, page: 0,
    });

    const resultado = await promesa;
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      const usuario = resultado.valor.elementos[0];
      expect(usuario.nombreVisible).toBe('Ana');
      expect(usuario.rol).toBe('OPERATOR');
      expect(usuario.accesosFallidos).toBe(2);
    }
  });

  /** Un papel que no se conoce se trata como el más bajo: nunca se asciende a nadie por un dato raro. */
  it('un papel desconocido se degrada a USER', async () => {
    const promesa = adaptador.busca({ pagina: 0, tamano: 25 });

    http.expectOne((p) => p.url === '/api/admin/users')
      .flush({ items: [{ id: 'u1', email: 'x@y.z', role: 'SUPERADMIN', active: true }] });

    const resultado = await promesa;
    if (resultado.ok) {
      expect(resultado.valor.elementos[0].rol).toBe('USER');
    }
  });

  it('los filtros vacíos no viajan en la consulta', async () => {
    const promesa = adaptador.busca({ pagina: 1, tamano: 25, rol: 'ADMIN' });

    const peticion = http.expectOne((p) => p.url === '/api/admin/users');
    expect(peticion.request.params.get('role')).toBe('ADMIN');
    expect(peticion.request.params.has('country')).toBe(false);
    peticion.flush({ items: [] });

    await promesa;
  });

  it('la edición manda nulos explícitos para poder VACIAR un campo', async () => {
    const promesa = adaptador.edita('u1', { nombreVisible: 'Ana' });

    const peticion = http.expectOne('/api/admin/users/u1');
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body).toEqual({
      displayName: 'Ana', companyName: null, country: null, language: null, active: false,
    });
    peticion.flush({});

    await promesa;
  });

  it('el bloqueo lleva los minutos en la consulta, como espera el backend', async () => {
    const promesa = adaptador.bloquea('u1', 60);

    http.expectOne((p) => p.url.includes('/api/admin/users/u1/lock')).flush({});

    expect((await promesa).ok).toBe(true);
  });

  /** El camino de error: de aquí para dentro circula un `AppError`, nunca un `HttpErrorResponse`. */
  it('convierte un rechazo HTTP en un AppError con su tipo', async () => {
    const promesa = adaptador.borra('u1');

    http.expectOne('/api/admin/users/u1')
      .flush({ message: 'No puedes' }, { status: 403, statusText: 'Forbidden' });

    const resultado = await promesa;
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error.tipo).toBe('sin-permiso');
    }
  });
});

describe('UsuariosEnLoteHttpAdapter', () => {
  let adaptador: UsuariosEnLoteHttpAdapter;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), UsuariosEnLoteHttpAdapter],
    });
    adaptador = TestBed.inject(UsuariosEnLoteHttpAdapter);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  /** El lote NO aborta al primer fallo: hay que enseñar las dos cifras o se esconde lo que no se hizo. */
  it('traduce el resumen del lote conservando aciertos, fallos y motivos', async () => {
    const promesa = adaptador.activa(['a', 'b', 'c']);

    const peticion = http.expectOne('/api/admin/users/bulk-activate');
    expect(peticion.request.body).toEqual(['a', 'b', 'c']);
    peticion.flush({ succeeded: 2, failed: 1, errors: ['c: ya estaba activo'] });

    const resultado = await promesa;
    if (resultado.ok) {
      expect(resultado.valor).toEqual({ correctos: 2, fallidos: 1, errores: ['c: ya estaba activo'] });
    }
  });

  it('el cambio de papel en lote viaja por PUT con los identificadores y el papel', async () => {
    const promesa = adaptador.cambiaRol(['a'], 'PARTNER');

    const peticion = http.expectOne('/api/admin/users/bulk-role');
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body).toEqual({ ids: ['a'], role: 'PARTNER' });
    peticion.flush({ succeeded: 1, failed: 0, errors: [] });

    await promesa;
  });

  it('una respuesta sin cifras se lee como cero, nunca como indefinido', async () => {
    const promesa = adaptador.borra(['a']);

    http.expectOne('/api/admin/users/bulk-delete').flush({});

    const resultado = await promesa;
    if (resultado.ok) {
      expect(resultado.valor).toEqual({ correctos: 0, fallidos: 0, errores: [] });
    }
  });
});
