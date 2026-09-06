import { cifra } from './cifra';

describe('cifra', () => {
  it('acepta números y textos decimales, que es como llegan los importes', () => {
    expect(cifra(12)).toBe(12);
    expect(cifra('1234.56')).toBe(1234.56);
  });

  /** «NaN €» en una tabla de saldos hace desconfiar de todo el panel. */
  it('nunca deja pasar un NaN', () => {
    expect(cifra(undefined)).toBe(0);
    expect(cifra(null)).toBe(0);
    expect(cifra('no es un número')).toBe(0);
    expect(cifra(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('admite otro valor por defecto cuando el cero significaría algo distinto', () => {
    expect(cifra(undefined, 100)).toBe(100);
  });
});
