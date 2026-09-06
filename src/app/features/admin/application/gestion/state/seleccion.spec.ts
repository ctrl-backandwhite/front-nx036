import { signal } from '@angular/core';
import { Seleccion } from './seleccion';

describe('Seleccion', () => {
  let seleccion: Seleccion;

  beforeEach(() => {
    seleccion = new Seleccion();
  });

  it('empieza vacía', () => {
    expect(seleccion.cuantos()).toBe(0);
    expect(seleccion.hayAlguno()).toBe(false);
  });

  it('marca y desmarca una fila', () => {
    seleccion.alterna('a');
    expect(seleccion.tiene('a')).toBe(true);

    seleccion.alterna('a');
    expect(seleccion.tiene('a')).toBe(false);
  });

  /**
   * La casilla de la cabecera significa «las de ESTA pantalla»: al cambiar de página lo visible cambia,
   * y guardar «todas» dejaría marcadas filas que quien pulsó no llegó a ver.
   */
  it('la casilla de cabecera marca solo las que se le pasan', () => {
    seleccion.alternaTodos(['a', 'b']);

    expect(seleccion.cuantos()).toBe(2);
    expect(seleccion.tiene('c')).toBe(false);
  });

  it('vuelve a pulsarse y desmarca las mismas, sin tocar las de otra página', () => {
    seleccion.alterna('z');
    seleccion.alternaTodos(['a', 'b']);

    seleccion.alternaTodos(['a', 'b']);

    expect(seleccion.tiene('a')).toBe(false);
    expect(seleccion.tiene('z')).toBe(true);
  });

  /** Una lista vacía no puede dejar la casilla de cabecera activada sin filas debajo. */
  it('sin filas no cuenta como «todas marcadas»', () => {
    expect(seleccion.todosMarcados([])).toBe(false);
  });

  it('la señal derivada sigue a la lista visible', () => {
    const visibles = signal<readonly string[]>(['a', 'b']);
    const todas = seleccion.todosMarcadosDe(visibles);
    seleccion.alternaTodos(['a', 'b']);
    expect(todas()).toBe(true);

    // Al pasar de página aparece una fila sin marcar: la casilla deja de estar activada.
    visibles.set(['a', 'b', 'c']);
    expect(todas()).toBe(false);
  });

  it('devuelve las filas marcadas en el orden de la lista, no en el de marcado', () => {
    const filas = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    seleccion.alterna('c');
    seleccion.alterna('a');

    expect(seleccion.filasDe(filas).map((f) => f.id)).toEqual(['a', 'c']);
  });

  it('limpiar deja la selección como al principio', () => {
    seleccion.alternaTodos(['a', 'b']);

    seleccion.limpia();

    expect(seleccion.cuantos()).toBe(0);
  });
});
