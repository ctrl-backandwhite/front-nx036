import { Divisa, convierte, formateaImporte, tasaDe } from './divisa';

const divisas: readonly Divisa[] = [
  { codigo: 'USD', porDolar: 1 },
  { codigo: 'EUR', porDolar: 0.92 },
  { codigo: 'CNY', porDolar: 7.2 },
];

describe('divisa', () => {
  it('una divisa desconocida no puede inventar un cambio', () => {
    expect(tasaDe(divisas, 'XXX')).toBe(1);
    expect(tasaDe([{ codigo: 'ZZZ', porDolar: 0 }], 'ZZZ')).toBe(1);
  });

  describe('convierte', () => {
    /** Pasar de la divisa a dólares es DIVIDIR: multiplicar deja los importes a un 15 % de lo que valen. */
    it('pasa por el dólar en el sentido correcto', () => {
      expect(convierte(72, 'CNY', 'USD', divisas)).toBeCloseTo(10);
      expect(convierte(10, 'USD', 'EUR', divisas)).toBeCloseTo(9.2);
    });

    it('cero es cero, sin dar vueltas', () => {
      expect(convierte(0, 'CNY', 'EUR', divisas)).toBe(0);
      expect(convierte(Number.NaN, 'CNY', 'EUR', divisas)).toBe(0);
    });
  });

  describe('formateaImporte', () => {
    it('deja que Intl coloque el símbolo y los decimales de cada divisa', () => {
      expect(formateaImporte(12.5, 'EUR', 'es')).toContain('12,50');
    });

    /** Si el código no vale, Intl lanza: antes que dejar la celda en blanco, se enseña el número. */
    it('un código inválido no deja la celda en blanco', () => {
      expect(formateaImporte(12.5, 'NO-VALE', 'es')).toBe('12.50 NO-VALE');
    });
  });
});
