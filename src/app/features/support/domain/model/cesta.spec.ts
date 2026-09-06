import { describe, expect, it } from 'vitest';
import { lineasConsultables, unidadesEnLaCesta } from './cesta';

describe('unidadesEnLaCesta', () => {
  it('suma las cantidades, no las líneas', () => {
    expect(
      unidadesEnLaCesta([
        { idProducto: 'p1', cantidad: 2 },
        { idProducto: 'p2', cantidad: 3 },
      ]),
    ).toBe(5);
  });

  it('una cesta vacía son cero unidades', () => {
    expect(unidadesEnLaCesta([])).toBe(0);
  });
});

describe('lineasConsultables', () => {
  it('descarta lo que no tiene producto: no hay nada que preguntar', () => {
    const lineas = [
      { idProducto: 'p1', cantidad: 1 },
      { idProducto: '', cantidad: 4 },
    ];
    expect(lineasConsultables(lineas).map((l) => l.idProducto)).toEqual(['p1']);
  });
});
