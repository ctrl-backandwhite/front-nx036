import {
  numeroDeFiltro,
  saleDelFiltro,
  siguienteOrdenDePrecio,
  estadoLegible,
  tendenciaAFraccion,
  tendenciaSobreCien,
  ventasAbreviadas,
} from './producto-admin';

describe('producto-admin', () => {
  describe('siguienteOrdenDePrecio', () => {
    /** El tercer paso devuelve al orden del backend, que es una opción legítima y no un «sin orden». */
    it('cicla natural, ascendente, descendente y vuelve al natural', () => {
      expect(siguienteOrdenDePrecio(undefined)).toBe('price_asc');
      expect(siguienteOrdenDePrecio('price_asc')).toBe('price_desc');
      expect(siguienteOrdenDePrecio('price_desc')).toBeUndefined();
    });
  });

  describe('numeroDeFiltro', () => {
    it('acepta la coma decimal, que es lo que teclea media Europa', () => {
      expect(numeroDeFiltro('12,5')).toBe(12.5);
      expect(numeroDeFiltro(' 30 ')).toBe(30);
    });

    /** Un campo a medio escribir viajaría como NaN y dejaría la tabla vacía sin explicación. */
    it('un campo vacío o a medio escribir NO es un filtro', () => {
      expect(numeroDeFiltro('')).toBeUndefined();
      expect(numeroDeFiltro('   ')).toBeUndefined();
      expect(numeroDeFiltro('doce')).toBeUndefined();
    });
  });

  it('la tendencia se teclea sobre cien y se guarda de cero a uno', () => {
    expect(tendenciaAFraccion('73')).toBeCloseTo(0.73);
    expect(tendenciaAFraccion('')).toBeUndefined();
  });

  it('la tendencia se lee sobre cien, y sin dato se enseña un guion', () => {
    expect(tendenciaSobreCien(0.734)).toBe('73/100');
    expect(tendenciaSobreCien(null)).toBe('—');
    expect(tendenciaSobreCien(undefined)).toBe('—');
  });

  describe('ventasAbreviadas', () => {
    it('abrevia solo cuando el número no cabe en la columna', () => {
      expect(ventasAbreviadas(120)).toBe('120');
      expect(ventasAbreviadas(9999)).toBe('9999');
      expect(ventasAbreviadas(12500)).toBe('12.5k');
    });

    it('sin ventas se enseña un guion, no un cero', () => {
      expect(ventasAbreviadas(0)).toBe('—');
    });
  });

  it('un estado sin traducir se escribe para una persona', () => {
    expect(estadoLegible('AWAITING_PAYMENT')).toBe('Awaiting payment');
    expect(estadoLegible('')).toBe('');
  });

  describe('saleDelFiltro', () => {
    /** Sin filtro puesto, la fila nunca se cae de la lista: no hay nada que incumplir. */
    it('sin filtro puesto la fila se queda', () => {
      expect(saleDelFiltro(undefined, 'ACTIVE')).toBe(false);
    });

    it('con filtro puesto, la fila que deja de cumplirlo se cae', () => {
      expect(saleDelFiltro('DRAFT', 'ACTIVE')).toBe(true);
      expect(saleDelFiltro('ACTIVE', 'ACTIVE')).toBe(false);
    });
  });
});
