import { signal } from '@angular/core';
import { Seleccion } from './seleccion';

describe('Seleccion', () => {
  it('arranca vacía', () => {
    const seleccion = new Seleccion();

    expect(seleccion.cuantos()).toBe(0);
    expect(seleccion.hayAlguno()).toBe(false);
  });

  it('marca y desmarca una fila', () => {
    const seleccion = new Seleccion();

    seleccion.alterna('a');
    expect(seleccion.tiene('a')).toBe(true);

    seleccion.alterna('a');
    expect(seleccion.tiene('a')).toBe(false);
  });

  /**
   * La casilla de cabecera significa «las de esta pantalla»: al cambiar de página lo visible cambia,
   * y guardar «todas» dejaría marcadas filas que ya no se ven.
   */
  it('la casilla de cabecera marca solo las que se le pasan', () => {
    const seleccion = new Seleccion();

    seleccion.alternaTodos(['a', 'b']);

    expect(seleccion.cuantos()).toBe(2);
    expect(seleccion.tiene('c')).toBe(false);
  });

  it('si ya estaban todas marcadas, la cabecera las desmarca', () => {
    const seleccion = new Seleccion();
    seleccion.alternaTodos(['a', 'b']);

    seleccion.alternaTodos(['a', 'b']);

    expect(seleccion.cuantos()).toBe(0);
  });

  it('marcar todas conserva lo marcado de otras páginas', () => {
    const seleccion = new Seleccion();
    seleccion.alterna('z');

    seleccion.alternaTodos(['a', 'b']);

    expect(seleccion.cuantos()).toBe(3);
  });

  /** Sin esto, la casilla de cabecera aparecía activada sobre una tabla vacía. */
  it('una lista vacía NO cuenta como «todas marcadas»', () => {
    expect(new Seleccion().todosMarcados([])).toBe(false);
  });

  it('la señal derivada sigue a la lista visible', () => {
    const seleccion = new Seleccion();
    const visibles = signal<readonly string[]>(['a']);
    const todas = seleccion.todosMarcadosDe(visibles);

    expect(todas()).toBe(false);

    seleccion.alterna('a');
    expect(todas()).toBe(true);

    visibles.set(['a', 'b']);
    expect(todas()).toBe(false);
  });

  it('devuelve las filas marcadas en el orden de la lista, no en el de marcado', () => {
    const seleccion = new Seleccion();
    const filas = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

    seleccion.alterna('c');
    seleccion.alterna('a');

    expect(seleccion.filasDe(filas).map((f) => f.id)).toEqual(['a', 'c']);
  });

  it('limpiar deja la selección a cero', () => {
    const seleccion = new Seleccion();
    seleccion.alternaTodos(['a', 'b']);

    seleccion.limpia();

    expect(seleccion.hayAlguno()).toBe(false);
  });
});
