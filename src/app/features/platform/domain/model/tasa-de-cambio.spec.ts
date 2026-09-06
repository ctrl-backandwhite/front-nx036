import { TasaDeCambio, aDolares, convierte, formateaImporte, tasaDe } from './tasa-de-cambio';

const TASAS: readonly TasaDeCambio[] = [
  { codigo: 'USD', porDolar: 1 },
  { codigo: 'EUR', porDolar: 0.92 },
  { codigo: 'CNY', porDolar: 7.24 },
];

describe('tasaDe', () => {
  it('devuelve la tasa de la divisa', () => {
    expect(tasaDe(TASAS, 'CNY')).toBe(7.24);
  });

  it('cae a uno cuando la divisa no está o su tasa no es utilizable', () => {
    // Un cambio desconocido no puede inventar un importe: se enseña en su divisa de origen.
    expect(tasaDe(TASAS, 'XYZ')).toBe(1);
    expect(tasaDe([{ codigo: 'BAD', porDolar: 0 }], 'BAD')).toBe(1);
  });
});

describe('aDolares', () => {
  it('divide por la tasa: la tasa son unidades por UN dólar', () => {
    expect(aDolares(100, 'EUR', TASAS)).toBeCloseTo(108.6957, 4);
    expect(aDolares(724, 'CNY', TASAS)).toBeCloseTo(100, 6);
  });

  it('no toca lo que ya está en dólares', () => {
    expect(aDolares(42, 'USD', TASAS)).toBe(42);
  });

  it('cero y lo que no es número valen cero', () => {
    expect(aDolares(0, 'EUR', TASAS)).toBe(0);
    expect(aDolares(Number.NaN, 'EUR', TASAS)).toBe(0);
  });
});

describe('convierte', () => {
  it('pasa de una divisa a otra a través del dólar', () => {
    // 724 CNY → 100 USD → 92 EUR
    expect(convierte(724, 'CNY', 'EUR', TASAS)).toBeCloseTo(92, 6);
  });

  it('de una divisa a sí misma devuelve el mismo importe', () => {
    expect(convierte(50, 'EUR', 'EUR', TASAS)).toBeCloseTo(50, 6);
  });
});

describe('formateaImporte', () => {
  it('usa el formato del idioma y de la divisa', () => {
    const enIngles = formateaImporte(1234.56, 'USD', 'en');
    expect(enIngles).toContain('1,234.56');
    expect(enIngles).toContain('$');
  });

  it('no revienta con una divisa inválida: enseña el número con el código detrás', () => {
    // `Intl` lanza con un código que no es de tres letras; una excepción aquí dejaría la rejilla
    // entera de productos sin pintar por un dato mal guardado en una fila.
    expect(formateaImporte(12.5, 'NO_ES_UNA_DIVISA', 'es')).toBe('12.50 NO_ES_UNA_DIVISA');
  });
});
