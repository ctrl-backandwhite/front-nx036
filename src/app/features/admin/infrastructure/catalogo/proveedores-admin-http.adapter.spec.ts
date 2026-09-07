import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiService } from '@core/http/api.service';
import { APP_CONFIG } from '@core/config/app-config';
import { CambiosDeProveedor } from '../../domain/catalogo/model/proveedor-admin';
import { ProveedoresAdminHttpAdapter } from './proveedores-admin-http.adapter';

/**
 * Los proveedores del panel contra el backend.
 *
 * <p>Lo que se fija son los filtros y los respaldos. Los filtros porque un valor vacío que viajara como
 * cadena vacía haría que el servidor buscara «el país “”» —cero resultados y ningún error—; y los
 * respaldos porque la marca de VERIFICADO decide qué se enseña como fiable en el escaparate, y una
 * ausencia interpretada como cierto convertiría en fiable a un proveedor que nadie ha revisado.
 */
describe('ProveedoresAdminHttpAdapter', () => {
  function monta() {
    TestBed.configureTestingModule({
      providers: [
        ProveedoresAdminHttpAdapter,
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
      adaptador: TestBed.inject(ProveedoresAdminHttpAdapter),
      red: TestBed.inject(HttpTestingController),
    };
  }

  const enLista = () => (p: { url: string }) => p.url === '/api/admin/catalog/suppliers';

  /** Los cambios completos: el puerto los exige todos, aunque la pantalla solo toque unos pocos. */
  const cambios = (parcial: Partial<CambiosDeProveedor> = {}): CambiosDeProveedor => ({
    nombre: 'Yiwu Textiles',
    nombreZh: '',
    pais: 'CN',
    ciudad: '',
    valoracion: null,
    anosActivo: null,
    verificado: false,
    trustPass: true,
    urlPerfil: '',
    ...parcial,
  });

  it('traduce el proveedor al vocabulario del dominio', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.lista({ pagina: 0, tamano: 50 });
    red.expectOne(enLista()).flush({
      items: [
        {
          id: 'sp1',
          externalId: '1688-777',
          source: '1688',
          name: 'Yiwu Textiles',
          country: 'CN',
          verified: true,
          trustPass: true,
          productCount: 120,
          onTimePct: 96,
        },
      ],
      totalElements: 1,
      totalPages: 1,
    });

    const resultado = await enCurso;
    expect(resultado.ok && resultado.valor.proveedores[0]).toMatchObject({
      id: 'sp1',
      idExterno: '1688-777',
      origen: '1688',
      nombre: 'Yiwu Textiles',
      verificado: true,
      numeroDeProductos: 120,
      puntualidadPorcentaje: 96,
    });
  });

  /** Una ausencia tomada por cierto convertiría en fiable a un proveedor que nadie ha revisado. */
  it('sin marca de verificación, el proveedor NO está verificado', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.lista({ pagina: 0, tamano: 50 });
    red.expectOne(enLista()).flush({ items: [{ id: 'sp1', name: 'Sin revisar' }] });

    const resultado = await enCurso;
    expect(resultado.ok && resultado.valor.proveedores[0].verificado).toBe(false);
    expect(resultado.ok && resultado.valor.proveedores[0].trustPass).toBe(false);
    expect(resultado.ok && resultado.valor.proveedores[0].numeroDeProductos).toBe(0);
  });

  it('una página sin datos no revienta al recorrerla', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.lista({ pagina: 0, tamano: 50 });
    red.expectOne(enLista()).flush({});

    const resultado = await enCurso;
    expect(resultado.ok && resultado.valor).toEqual({ proveedores: [], total: 0, paginas: 1 });
  });

  /** Un filtro vacío que viajara haría buscar «el país “”»: cero resultados y ningún error. */
  it('los filtros vacíos NO viajan', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.lista({ texto: '', pais: '', pagina: 0, tamano: 50 });
    const peticion = red.expectOne(enLista());

    expect(peticion.request.params.has('q')).toBe(false);
    expect(peticion.request.params.has('country')).toBe(false);
    peticion.flush({});
    await enCurso;
  });

  it('y los que sí tienen valor viajan con el nombre del servidor', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.lista({
      texto: 'yiwu',
      pais: 'CN',
      verificado: true,
      pagina: 2,
      tamano: 25,
    });
    const peticion = red.expectOne(enLista());

    expect(peticion.request.params.get('q')).toBe('yiwu');
    expect(peticion.request.params.get('country')).toBe('CN');
    expect(peticion.request.params.get('verified')).toBe('true');
    expect(peticion.request.params.get('page')).toBe('2');
    peticion.flush({});
    await enCurso;
  });

  it('crear manda el cuerpo con los nombres del servidor', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.crea(cambios());
    const peticion = red.expectOne('/api/admin/catalog/suppliers/create');

    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toMatchObject({
      name: 'Yiwu Textiles',
      country: 'CN',
      verified: false,
      trustPass: true,
    });
    peticion.flush({});
    await enCurso;
  });

  it('editar y borrar van sobre el proveedor concreto', async () => {
    const { adaptador, red } = monta();

    const editando = adaptador.actualiza('sp1', cambios({ nombre: 'Otro' }));
    const puesta = red.expectOne('/api/admin/catalog/suppliers/sp1');
    expect(puesta.request.method).toBe('PUT');
    puesta.flush({});
    await editando;

    const borrando = adaptador.elimina('sp1');
    const borrado = red.expectOne('/api/admin/catalog/suppliers/sp1');
    expect(borrado.request.method).toBe('DELETE');
    borrado.flush({});
    await borrando;
  });

  /** El identificador puede traer caracteres que rompen una ruta: viaja codificado. */
  it('un identificador con caracteres raros se codifica en la ruta', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.elimina('sp/1');
    red.expectOne('/api/admin/catalog/suppliers/sp%2F1').flush({});

    await enCurso;
  });

  it('alternar la verificación es un POST sin cuerpo', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.alternaVerificado('sp1');
    const peticion = red.expectOne('/api/admin/catalog/suppliers/sp1/verify');

    expect(peticion.request.method).toBe('POST');
    peticion.flush({});
    expect((await enCurso).ok).toBe(true);
  });

  it('reindexar devuelve cuántos se indexaron', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.reindexa();
    red.expectOne('/api/admin/catalog/suppliers/reindex').flush({ indexed: 58 });

    const resultado = await enCurso;
    expect(resultado.ok && resultado.valor).toBe(58);
  });

  describe('operaciones en lote', () => {
    it('verificar en lote fija la marca para todos los enviados', async () => {
      const { adaptador, red } = monta();

      const enCurso = adaptador.verifica(['sp1', 'sp2'], true);
      const peticion = red.expectOne('/api/admin/catalog/suppliers/bulk-verify');

      expect(peticion.request.method).toBe('PUT');
      expect(peticion.request.body).toEqual({ ids: ['sp1', 'sp2'], verified: true });
      peticion.flush({ succeeded: 2, failed: 0, errors: [] });

      const resultado = await enCurso;
      expect(resultado.ok && resultado.valor).toEqual({
        correctos: 2,
        fallidos: 0,
        errores: [],
      });
    });

    /** Un lote a medias tiene que llegar con sus DOS cifras y sus motivos, o no hay nada que corregir. */
    it('un lote a medias conserva el recuento y los motivos', async () => {
      const { adaptador, red } = monta();

      const enCurso = adaptador.eliminaEnLote(['sp1', 'sp2', 'sp3']);
      red
        .expectOne('/api/admin/catalog/suppliers/bulk-delete')
        .flush({ succeeded: 1, failed: 2, errors: ['sp2: tiene productos', 'sp3: tiene pedidos'] });

      const resultado = await enCurso;
      expect(resultado.ok && resultado.valor).toEqual({
        correctos: 1,
        fallidos: 2,
        errores: ['sp2: tiene productos', 'sp3: tiene pedidos'],
      });
    });

    it('una respuesta sin cifras se lee como cero y sin motivos', async () => {
      const { adaptador, red } = monta();

      const enCurso = adaptador.eliminaEnLote(['sp1']);
      red.expectOne('/api/admin/catalog/suppliers/bulk-delete').flush({});

      const resultado = await enCurso;
      expect(resultado.ok && resultado.valor).toEqual({ correctos: 0, fallidos: 0, errores: [] });
    });
  });

  it('un fallo vuelve como error, no como excepción', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.lista({ pagina: 0, tamano: 50 });
    red.expectOne(enLista()).error(new ProgressEvent('error'));

    expect((await enCurso).ok).toBe(false);
  });
});
