import { porcentajeActivo, productosInactivos, ultimosDias, valoresDeLaSerie } from './panel';

describe('porcentajeActivo', () => {
  it('redondea la proporción de catálogo publicado', () => {
    expect(porcentajeActivo(50, 200)).toBe(25);
  });

  /** Sin catálogo no es «cero por ciento publicado»: es que no hay nada que publicar. */
  it('devuelve cero cuando no hay productos, en vez de dividir por cero', () => {
    expect(porcentajeActivo(0, 0)).toBe(0);
  });
});

describe('productosInactivos', () => {
  it('resta los publicados del total', () => {
    expect(productosInactivos(30, 100)).toBe(70);
  });

  it('nunca es negativo, aunque las dos cifras lleguen cruzadas', () => {
    expect(productosInactivos(120, 100)).toBe(0);
  });
});

describe('ultimosDias', () => {
  it('construye el eje del más antiguo al más reciente y acaba en hoy', () => {
    const dias = ultimosDias(3, new Date('2026-03-05T10:00:00Z'));

    expect(dias).toEqual(['2026-03-03', '2026-03-04', '2026-03-05']);
  });

  it('cruza el cambio de mes sin saltarse días', () => {
    const dias = ultimosDias(3, new Date('2026-03-02T10:00:00Z'));

    expect(dias).toEqual(['2026-02-28', '2026-03-01', '2026-03-02']);
  });
});

describe('valoresDeLaSerie', () => {
  const dias = ['2026-03-03', '2026-03-04', '2026-03-05'];

  /**
   * Los días sin ventas no vienen en el diccionario. Rellenarlos con cero es lo que impide que la
   * gráfica junte dos semanas flojas como si fueran seguidas.
   */
  it('pone cero en los días que la serie no trae', () => {
    expect(valoresDeLaSerie(dias, { '2026-03-04': 5 })).toEqual([0, 5, 0]);
  });

  it('divide cuando la serie llega en céntimos', () => {
    expect(valoresDeLaSerie(dias, { '2026-03-05': 12500 }, 100)).toEqual([0, 0, 125]);
  });

  it('sin serie devuelve el eje entero a cero', () => {
    expect(valoresDeLaSerie(dias, undefined)).toEqual([0, 0, 0]);
  });
});
