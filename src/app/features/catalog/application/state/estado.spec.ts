import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { FavoritosStore } from './favoritos.store';
import { ReferenciaDeCestaStore } from './referencia-de-cesta.store';

describe('FavoritosStore', () => {
  function almacen(): FavoritosStore {
    TestBed.configureTestingModule({});
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
    TestBed.configureTestingModule({});
    const store = TestBed.inject(ReferenciaDeCestaStore);
    expect(store.hayCesta()).toBe(false);
    store.fija(['p1']);
    expect(store.productos()).toEqual(['p1']);
    expect(store.hayCesta()).toBe(true);
  });
});
