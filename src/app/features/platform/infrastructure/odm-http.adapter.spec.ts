import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EstadoDeProyectoOdmHttpAdapter, ProyectosOdmHttpAdapter } from './odm-http.adapter';

const DTO = {
  id: 'p1',
  kind: 'OEM',
  title: 'Botella térmica',
  brief: 'De acero',
  budgetUsdCents: 10870,
  slaDays: 30,
  status: 'INTAKE',
  createdAt: '2026-09-01T00:00:00Z',
};

describe('ProyectosOdmHttpAdapter', () => {
  let http: HttpTestingController;
  let adaptador: ProyectosOdmHttpAdapter;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ProyectosOdmHttpAdapter],
    });
    http = TestBed.inject(HttpTestingController);
    adaptador = TestBed.inject(ProyectosOdmHttpAdapter);
  });

  afterEach(() => http.verify());

  it('traduce un proyecto del backend al dominio', async () => {
    const promesa = adaptador.mios();

    http.expectOne('/api/me/odm/projects').flush([DTO]);

    const resultado = await promesa;
    expect(resultado.ok ? resultado.valor[0] : null).toEqual({
      id: 'p1',
      clase: 'OEM',
      titulo: 'Botella térmica',
      resumen: 'De acero',
      presupuestoEnCentimosUsd: 10870,
      diasDeCompromiso: 30,
      estado: 'INTAKE',
      creadoEl: '2026-09-01T00:00:00Z',
    });
  });

  it('crea y actualiza con el mismo cuerpo, en el vocabulario del backend', async () => {
    const creando = adaptador.crea({
      clase: 'OEM',
      titulo: 'Botella',
      resumen: 'De acero',
      presupuestoEnCentimosUsd: 10870,
    });
    const alta = http.expectOne({ method: 'POST', url: '/api/me/odm/projects' });
    expect(alta.request.body).toEqual({
      kind: 'OEM',
      title: 'Botella',
      brief: 'De acero',
      budgetUsdCents: 10870,
    });
    alta.flush(DTO);
    expect((await creando).ok).toBe(true);

    const actualizando = adaptador.actualiza('p1', { clase: 'OEM', titulo: 'Otra' });
    http.expectOne({ method: 'PUT', url: '/api/me/odm/projects/p1' }).flush(DTO);
    expect((await actualizando).ok).toBe(true);
  });

  it('elimina un proyecto', async () => {
    const promesa = adaptador.elimina('p1');
    http.expectOne({ method: 'DELETE', url: '/api/me/odm/projects/p1' }).flush(null);
    expect((await promesa).ok).toBe(true);
  });
});

describe('EstadoDeProyectoOdmHttpAdapter', () => {
  let http: HttpTestingController;
  let adaptador: EstadoDeProyectoOdmHttpAdapter;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), EstadoDeProyectoOdmHttpAdapter],
    });
    http = TestBed.inject(HttpTestingController);
    adaptador = TestBed.inject(EstadoDeProyectoOdmHttpAdapter);
  });

  afterEach(() => http.verify());

  it('avanza el estado por la ruta de ADMINISTRACIÓN, que es otro permiso', async () => {
    const promesa = adaptador.cambia('p1', 'IN_PRODUCTION');

    const peticion = http.expectOne({ method: 'PUT', url: '/api/admin/odm/projects/p1/status' });
    expect(peticion.request.body).toEqual({ status: 'IN_PRODUCTION' });
    peticion.flush({ ...DTO, status: 'IN_PRODUCTION' });

    const resultado = await promesa;
    expect(resultado.ok ? resultado.valor.estado : null).toBe('IN_PRODUCTION');
  });

  it('sin permiso el fallo llega como «sin permiso», no como excepción', async () => {
    const promesa = adaptador.cambia('p1', 'APPROVED');

    http
      .expectOne({ method: 'PUT', url: '/api/admin/odm/projects/p1/status' })
      .flush({ message: 'No' }, { status: 403, statusText: 'Forbidden' });

    const resultado = await promesa;
    expect(resultado.ok ? null : resultado.error.tipo).toBe('sin-permiso');
  });
});
