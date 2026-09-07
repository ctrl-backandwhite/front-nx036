import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiService } from '@core/http/api.service';
import { APP_CONFIG } from '@core/config/app-config';
import { BorradorDeCategoria } from '../../domain/catalogo/model/categoria-admin';
import { CategoriasAdminHttpAdapter } from './categorias-admin-http.adapter';

/**
 * Las categorías del panel contra el backend.
 *
 * <p>Este adaptador existe, en buena parte, para tapar una INCOHERENCIA del propio backend: el alta
 * espera el contrato de ingesta, que llama `nameTranslations` a lo que la edición llama `names`.
 * Traducirlo aquí es lo que evita que esa rareza suba al dominio y acabe repartida por las pantallas.
 *
 * <p>Y el árbol se APLANA a «Padre › Hijo» para poder elegirlo en un desplegable: sin la ruta completa,
 * dos categorías llamadas «Camisetas» —una de hombre y otra de niño— son indistinguibles en la lista.
 */
describe('CategoriasAdminHttpAdapter', () => {
  function monta() {
    TestBed.configureTestingModule({
      providers: [
        CategoriasAdminHttpAdapter,
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
      adaptador: TestBed.inject(CategoriasAdminHttpAdapter),
      red: TestBed.inject(HttpTestingController),
    };
  }

  const borrador = (parcial: Partial<BorradorDeCategoria> = {}): BorradorDeCategoria => ({
    slug: 'moda-mujer',
    nombreZh: '女装',
    nombreEn: 'Women',
    nombreEs: 'Moda mujer',
    nombrePt: '',
    padreId: '',
    ...parcial,
  });

  const paginada = () => (p: { url: string }) =>
    p.url === '/api/admin/catalog/categories/paged';

  it('traduce la categoría al vocabulario del dominio', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.listaPaginada({ pagina: 0, tamano: 50 });
    red.expectOne(paginada()).flush({
      items: [
        {
          id: 'c1',
          slug: 'moda-mujer',
          nameZh: '女装',
          names: { es: 'Moda mujer', en: 'Women' },
          position: 3,
          active: true,
          parentId: 'c0',
          productCount: 42,
        },
      ],
      totalElements: 1,
      totalPages: 1,
    });

    const resultado = await enCurso;
    expect(resultado.ok && resultado.valor.categorias[0]).toMatchObject({
      id: 'c1',
      slug: 'moda-mujer',
      nombreZh: '女装',
      posicion: 3,
      activa: true,
      padreId: 'c0',
      numeroDeProductos: 42,
    });
  });

  /**
   * Ausente se toma como ACTIVA. Al revés haría desaparecer del escaparate categorías enteras que sí
   * están publicadas, y el síntoma sería «faltan productos», no «falta un campo».
   */
  it('una categoría sin marca de actividad cuenta como activa', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.listaPaginada({ pagina: 0, tamano: 50 });
    red.expectOne(paginada()).flush({ items: [{ id: 'c1', slug: 'x' }] });

    const resultado = await enCurso;
    expect(resultado.ok && resultado.valor.categorias[0]).toMatchObject({
      activa: true,
      nombreZh: '',
      nombres: {},
      posicion: 0,
      padreId: null,
      numeroDeProductos: 0,
    });
  });

  it('una página sin datos no revienta al recorrerla', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.listaPaginada({ pagina: 0, tamano: 50 });
    red.expectOne(paginada()).flush({});

    const resultado = await enCurso;
    expect(resultado.ok && resultado.valor).toEqual({ categorias: [], total: 0, paginas: 1 });
  });

  it('el texto vacío NO viaja como filtro', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.listaPaginada({ texto: '', pagina: 0, tamano: 50 });
    const peticion = red.expectOne(paginada());

    expect(peticion.request.params.has('q')).toBe(false);
    peticion.flush({});
    await enCurso;
  });

  it('y el filtro de «con productos» viaja cuando se elige', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.listaPaginada({ conProductos: false, pagina: 0, tamano: 50 });
    const peticion = red.expectOne(paginada());

    expect(peticion.request.params.get('hasProducts')).toBe('false');
    peticion.flush({});
    await enCurso;
  });

  it('el listado completo devuelve una lista vacía si no llega nada', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.listaTodas();
    red.expectOne('/api/admin/catalog/categories').flush(null);

    const resultado = await enCurso;
    expect(resultado.ok && resultado.valor).toEqual([]);
  });

  describe('el cuerpo que espera el backend', () => {
    /** El alta usa el contrato de ingesta; la edición, otro nombre para lo mismo. Se mandan los dos. */
    it('manda los nombres por partida doble: «names» y «nameTranslations»', async () => {
      const { adaptador, red } = monta();

      const enCurso = adaptador.crea(borrador());
      const peticion = red.expectOne('/api/admin/catalog/categories');

      expect(peticion.request.body.names).toEqual({ en: 'Women', es: 'Moda mujer', pt: undefined });
      expect(peticion.request.body.nameTranslations).toEqual({
        en: 'Women',
        es: 'Moda mujer',
        pt: undefined,
      });
      peticion.flush({});
      await enCurso;
    });

    /** El backend usa el chino como nombre canónico: dejarlo vacío dejaría la categoría sin identidad. */
    it('sin chino, cae al español', async () => {
      const { adaptador, red } = monta();

      const enCurso = adaptador.crea(borrador({ nombreZh: '' }));
      const peticion = red.expectOne('/api/admin/catalog/categories');

      expect(peticion.request.body.nameZh).toBe('Moda mujer');
      peticion.flush({});
      await enCurso;
    });

    /** Una categoría raíz tiene padre NULO, no cadena vacía: el backend distingue las dos cosas. */
    it('sin padre, viaja un nulo y no una cadena vacía', async () => {
      const { adaptador, red } = monta();

      const enCurso = adaptador.crea(borrador({ padreId: '' }));
      const peticion = red.expectOne('/api/admin/catalog/categories');

      expect(peticion.request.body.parentId).toBeNull();
      peticion.flush({});
      await enCurso;
    });
  });

  it('editar, borrar y alternar van sobre la categoría concreta', async () => {
    const { adaptador, red } = monta();

    const editando = adaptador.actualiza('c1', borrador());
    const puesta = red.expectOne('/api/admin/catalog/categories/c1');
    expect(puesta.request.method).toBe('PUT');
    puesta.flush({});
    await editando;

    const alternando = adaptador.alterna('c1');
    red.expectOne('/api/admin/catalog/categories/c1/toggle').flush({});
    await alternando;

    const borrando = adaptador.elimina('c1');
    const borrado = red.expectOne('/api/admin/catalog/categories/c1');
    expect(borrado.request.method).toBe('DELETE');
    borrado.flush({});
    expect((await borrando).ok).toBe(true);
  });

  it('activar en lote devuelve cuántas se cambiaron', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.activaEnLote(['c1', 'c2'], true);
    const peticion = red.expectOne('/api/admin/catalog/categories/bulk-active');

    expect(peticion.request.body).toEqual({ ids: ['c1', 'c2'], active: true });
    peticion.flush({ updated: 2 });

    const resultado = await enCurso;
    expect(resultado.ok && resultado.valor).toBe(2);
  });

  it('reindexar devuelve cuántas se indexaron, y cero si no lo dice', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.reindexa();
    red.expectOne('/api/admin/catalog/categories/reindex').flush({});

    const resultado = await enCurso;
    expect(resultado.ok && resultado.valor).toBe(0);
  });

  describe('el árbol para el desplegable', () => {
    /** Sin la ruta completa, dos «Camisetas» de ramas distintas son indistinguibles en la lista. */
    it('se aplana a «Padre › Hijo» y se ordena por esa ruta', async () => {
      const { adaptador, red } = monta();

      const enCurso = adaptador.consulta('es');
      const peticion = red.expectOne((p) => p.url === '/api/catalog/categories/tree');
      expect(peticion.request.params.get('lang')).toBe('es');
      peticion.flush([
        {
          id: 'h',
          name: 'Hombre',
          children: [{ id: 'hc', name: 'Camisetas' }],
        },
        {
          id: 'n',
          name: 'Niño',
          children: [{ id: 'nc', name: 'Camisetas' }],
        },
      ]);

      const resultado = await enCurso;
      expect(resultado.ok && resultado.valor.map((c) => c.etiqueta)).toEqual([
        'Hombre',
        'Hombre › Camisetas',
        'Niño',
        'Niño › Camisetas',
      ]);
    });

    it('un árbol vacío no revienta', async () => {
      const { adaptador, red } = monta();

      const enCurso = adaptador.consulta('es');
      red.expectOne((p) => p.url === '/api/catalog/categories/tree').flush(null);

      const resultado = await enCurso;
      expect(resultado.ok && resultado.valor).toEqual([]);
    });
  });

  it('un fallo vuelve como error, no como excepción', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.listaTodas();
    red.expectOne('/api/admin/catalog/categories').error(new ProgressEvent('error'));

    expect((await enCurso).ok).toBe(false);
  });
});
