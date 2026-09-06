import { describe, expect, it } from 'vitest';
import { formateaImporte } from './importe';

describe('formateaImporte', () => {
  it('formatea con la divisa pedida', () => {
    expect(formateaImporte(12.5, 'EUR', 'es')).toContain('12,50');
  });

  /** Quedarse sin pantalla por un código de tres letras mal escrito sería mucho peor. */
  it('con una divisa inexistente no revienta: enseña el número', () => {
    expect(formateaImporte(12.5, 'XXXX', 'es')).toBe('12.50 XXXX');
  });

  it('un número imposible se pinta como guión', () => {
    expect(formateaImporte(Number.NaN, 'EUR')).toBe('—');
  });
});
