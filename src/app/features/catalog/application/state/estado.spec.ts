import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { FavoritosStore } from './favoritos.store';
import { ListadoStore } from './listado.store';
import { ReferenciaDeCestaStore } from './referencia-de-cesta.store';
import { PaginaDeProductos, ResumenDeProducto } from '../../domain/model/producto';

describe('FavoritosStore', () => {
  function almacen(): FavoritosStore {
    TestBed.configureTestingModule({ providers: [FavoritosStore] });
    return TestBed.inject(FavoritosStore);
  }

  it('empieza vacío y sin cargar', () => {
    const store = almacen();
    expect(store.cuantos()).toBe(0);
    expect(store.cargados()).toBe(false);
  });

  it('guarda los identificadores que llegan', () => {
    const store = almacen();
    store.fija(['a', 'b']);
    expect(store.esFavorito('a')).toBe(true);
    expect(store.cuantos()).toBe(2);
    expect(store.cargados()).toBe(true);
  });

  /** El corazón se pinta antes de que conteste el servidor: si tarda, la gente vuelve a pulsar. */
  it('alterna en los dos sentidos', () => {
    const store = almacen();
    store.fija(['a']);
    store.alterna('a');
    expect(store.esFavorito('a')).toBe(false);
    store.alterna('a');
    expect(store.esFavorito('a')).toBe(true);
  });

  it('se limpia al cerrar sesión', () => {
    const store = almacen();
    store.fija(['a']);
    store.limpia();
    expect(store.cuantos()).toBe(0);
    expect(store.cargados()).toBe(false);
  });
});

describe('ReferenciaDeCestaStore', () => {
  it('sabe si hay algo con lo que comparar el arancel', () => {
    TestBed.configureTestingModule({ providers: [ReferenciaDeCestaStore] });
    const store = TestBed.inject(ReferenciaDeCestaStore);
    expect(store.hayCesta()).toBe(false);
    store.fija(['p1']);
    expect(store.productos()).toEqual(['p1']);
    expect(store.hayCesta()).toBe(true);
  });
});

describe('ListadoStore', () => {
  function almacen(): ListadoStore {
    TestBed.configureTestingModule({ providers: [ListadoStore] });
    return TestBed.inject(ListadoStore);
  }

  function producto(id: string): ResumenDeProducto {
    return {
      id,
      slug: id,
      titulo: id,
      ventasMensuales: 0,
      estado: 'ACTIVE',
      precio: { formateado: '9,90 €' },
      arancel: { centimosExtra: null, cubierto: false },
      etiquetas: [],
    };
  }

  function pagina(numero: number, totalDePaginas = 3): PaginaDeProductos {
    return {
      items: [producto(`p${numero}a`), producto(`p${numero}b`)],
      pagina: numero,
      tamano: 2,
      total: totalDePaginas * 2,
      totalDePaginas,
    };
  }

  it('empieza sin nada que enseñar y sin nada que traer', () => {
    const store = almacen();
    expect(store.productos()).toEqual([]);
    expect(store.paginasPedidas()).toBe(0);
    expect(store.hayMas()).toBe(false);
  });

  it('acumula las páginas en vez de sustituirlas', () => {
    const store = almacen();
    store.empieza('h1');
    store.guarda('h1', pagina(0));
    store.guarda('h1', pagina(1));
    expect(store.productos()).toHaveLength(4);
    expect(store.paginasPedidas()).toBe(2);
    expect(store.total()).toBe(6);
    expect(store.hayMas()).toBe(true);
  });

  it('deja de ofrecer más cuando ya están todas', () => {
    const store = almacen();
    store.empieza('h1');
    store.guarda('h1', pagina(0, 1));
    expect(store.hayMas()).toBe(false);
  });

  /** Lo que hace que volver de una ficha no vuelva a pedir: la búsqueda guardada es la misma. */
  it('lo guardado sirve solo para la misma búsqueda y solo si hay algo', () => {
    const store = almacen();
    store.empieza('h1');
    expect(store.sirve('h1')).toBe(false);
    store.guarda('h1', pagina(0));
    expect(store.sirve('h1')).toBe(true);
    expect(store.sirve('h2')).toBe(false);
  });

  /** Memoria rancia: un filtro nuevo, otro orden o un refresco no pueden reaprovechar lo anterior. */
  it('empezar otra búsqueda tira lo guardado', () => {
    const store = almacen();
    store.empieza('h1');
    store.guarda('h1', pagina(0));
    store.empieza('h2');
    expect(store.productos()).toEqual([]);
    expect(store.paginasPedidas()).toBe(0);
    expect(store.total()).toBe(0);
    expect(store.hayMas()).toBe(false);
    expect(store.sirve('h1')).toBe(false);
  });

  /**
   * Dos cambios de filtro seguidos dejan dos peticiones en el aire. La que llega tarde traía los
   * productos del filtro ANTERIOR: si se guardara, la pantalla enseñaría el resultado equivocado y al
   * volver de una ficha lo daría por bueno sin volver a preguntar.
   */
  it('descarta la respuesta que llega tarde de una búsqueda anterior', () => {
    const store = almacen();
    store.empieza('h1');
    store.empieza('h2');
    store.guarda('h1', pagina(0));
    expect(store.productos()).toEqual([]);
    expect(store.paginasPedidas()).toBe(0);
  });
});
