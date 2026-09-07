import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiService } from '@core/http/api.service';
import { APP_CONFIG } from '@core/config/app-config';
import { AlmacenesHttpAdapter } from './almacenes-http.adapter';

/**
 * Los almacenes de la red.
 *
 * <p>Lo que hay que fijar de un adaptador es la traducción en las DOS direcciones y, sobre todo, los
 * respaldos: son los que deciden qué se ve cuando el servidor no manda un campo, y no fallan — mienten.
 */
describe('AlmacenesHttpAdapter', () => {
  function monta() {
    TestBed.configureTestingModule({
      providers: [
        AlmacenesHttpAdapter,
        ApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: APP_CONFIG,
          useValue: { apiBase: '', produccion: false, urlPublica: '', entorno: 'prueba' },
        },
      ],
    });
    return {
      adaptador: TestBed.inject(AlmacenesHttpAdapter),
      red: TestBed.inject(HttpTestingController),
    };
  }

  it('traduce el almacén al vocabulario del dominio', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.lista();
    red
      .expectOne('/api/admin/warehouses')
      .flush([{ id: 'w1', code: 'ES-MAD', name: 'Madrid', country: 'ES', city: 'Madrid' }]);

    const resultado = await enCurso;
    expect(resultado.ok && resultado.valor[0]).toEqual({
      id: 'w1',
      codigo: 'ES-MAD',
      nombre: 'Madrid',
      pais: 'ES',
      ciudad: 'Madrid',
      activo: true,
    });
  });

  /**
   * Sin la marca se toma como ACTIVO. Al revés —darlo por apagado— haría desaparecer de la red un
   * almacén que sí despacha, y el pedido saldría de otro sitio o de ninguno.
   */
  it('un almacén sin marca de actividad cuenta como activo', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.lista();
    red.expectOne('/api/admin/warehouses').flush([{ id: 'w1', code: 'C', name: 'N' }]);

    const resultado = await enCurso;
    expect(resultado.ok && resultado.valor[0].activo).toBe(true);
  });

  it('pero uno apagado a propósito se respeta', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.lista();
    red
      .expectOne('/api/admin/warehouses')
      .flush([{ id: 'w1', code: 'C', name: 'N', active: false }]);

    const resultado = await enCurso;
    expect(resultado.ok && resultado.valor[0].activo).toBe(false);
  });

  it('una respuesta vacía es una lista vacía, no un nulo que reviente al recorrerlo', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.lista();
    red.expectOne('/api/admin/warehouses').flush(null);

    const resultado = await enCurso;
    expect(resultado.ok && resultado.valor).toEqual([]);
  });

  it('al crear manda los nombres que espera el servidor', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.crea({
      codigo: 'ES-MAD',
      nombre: 'Madrid',
      pais: 'ES',
      ciudad: 'Madrid',
      activo: true,
    });
    const peticion = red.expectOne('/api/admin/warehouses');

    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({
      code: 'ES-MAD',
      name: 'Madrid',
      country: 'ES',
      city: 'Madrid',
      active: true,
    });
    peticion.flush({});
    await enCurso;
  });

  it('editar es un PUT sobre el almacén concreto', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.actualiza('w1', {
      codigo: 'ES-MAD',
      nombre: 'Madrid 2',
      pais: 'ES',
      ciudad: 'Madrid',
      activo: false,
    });
    const peticion = red.expectOne('/api/admin/warehouses/w1');

    expect(peticion.request.method).toBe('PUT');
    peticion.flush({});
    await enCurso;
  });

  it('borrar es un DELETE, y un fallo vuelve como error, no como excepción', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.borra('w1');
    const peticion = red.expectOne('/api/admin/warehouses/w1');
    expect(peticion.request.method).toBe('DELETE');
    peticion.flush('no', { status: 409, statusText: 'Conflict' });

    const resultado = await enCurso;
    expect(resultado.ok).toBe(false);
  });
});
