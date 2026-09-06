import { Divisa, aCentimos, convierte, deCentimos, formatea, localeDeDivisa } from './dinero';

/** Tasas de verdad: unidades por dólar, igual que las manda el backend. */
const DIVISAS: readonly Divisa[] = [
  { codigo: 'USD', nombre: 'Dólar', simbolo: '$', tasaVsUsd: 1, activa: true },
  { codigo: 'EUR', nombre: 'Euro', simbolo: '€', tasaVsUsd: 0.92, activa: true, locale: 'es-ES' },
  { codigo: 'JPY', nombre: 'Yen', simbolo: '¥', tasaVsUsd: 155, activa: true },
  { codigo: 'ROTA', nombre: 'Sin tasa', simbolo: '?', tasaVsUsd: 0, activa: false },
];

describe('convierte', () => {
  it('pasa por el dólar: divide por la tasa de origen y multiplica por la de destino', () => {
    expect(convierte(100, 'USD', 'EUR', DIVISAS)).toBeCloseTo(92);
    expect(convierte(92, 'EUR', 'USD', DIVISAS)).toBeCloseTo(100);
  });

  it('no toca el importe cuando el origen y el destino son la misma divisa', () => {
    expect(convierte(37.5, 'EUR', 'EUR', DIVISAS)).toBe(37.5);
  });

  it('sin divisa de origen devuelve el importe tal cual', () => {
    expect(convierte(10, null, 'EUR', DIVISAS)).toBe(10);
  });

  /**
   * Con la tasa a cero se devuelve el importe SIN convertir en vez de infinito: es lo que evita que un
   * producto de 20 dólares se anuncie como «20 000» con el símbolo de otra moneda.
   */
  it('devuelve el importe sin convertir cuando alguna tasa es cero', () => {
    expect(convierte(20, 'ROTA', 'EUR', DIVISAS)).toBe(20);
    expect(convierte(20, 'USD', 'ROTA', DIVISAS)).toBe(20);
  });

  it('una divisa desconocida se trata como si su tasa fuera uno, no como un fallo', () => {
    expect(convierte(10, 'XXX', 'USD', DIVISAS)).toBe(10);
  });

  it('un importe que no es número se convierte en cero, nunca en NaN', () => {
    expect(convierte(Number.NaN, 'USD', 'EUR', DIVISAS)).toBe(0);
    expect(convierte(Number.POSITIVE_INFINITY, 'USD', 'EUR', DIVISAS)).toBe(0);
  });
});

describe('formatea', () => {
  /**
   * Lo que se comprueba es la PUNTUACIÓN, no el agrupado de los miles: el separador de millares
   * depende de los datos de idioma que traiga el entorno, y un Node compilado sin ellos lo omite. Lo
   * que nunca puede cambiar es que el decimal vaya con coma —con `en-US` saldría «€1,234.50», que se
   * lee como un importe mil veces mayor— y que el símbolo vaya detrás.
   */
  it('escribe el importe con el símbolo y la puntuación del idioma de la divisa', () => {
    const texto = formatea(1234.5, 'EUR', 'es-ES');

    expect(texto).toContain('€');
    expect(texto).toContain(',50');
    expect(texto).not.toContain('.50');
    expect(texto.trim().endsWith('€')).toBe(true);
  });

  it('el yen no lleva decimales: ponérselos multiplicaría el importe por cien a la vista', () => {
    expect(formatea(1500, 'JPY', 'ja-JP')).not.toContain('.00');
  });

  /** Un código que `Intl` no conoce hace que lance: se pinta el número con el código detrás. */
  it('cae a número más código cuando la divisa no existe', () => {
    expect(formatea(12.3, 'NOEXISTE', 'es-ES')).toContain('NOEXISTE');
  });
});

describe('localeDeDivisa', () => {
  it('conoce el idioma habitual de las divisas del catálogo', () => {
    expect(localeDeDivisa('EUR')).toBe('es-ES');
    expect(localeDeDivisa('BRL')).toBe('pt-BR');
  });

  it('para una divisa desconocida usa el inglés, que es el respaldo seguro', () => {
    expect(localeDeDivisa('XXX')).toBe('en-US');
  });
});

describe('céntimos', () => {
  it('convierte a unidades y de vuelta sin arrastrar el error de la coma flotante', () => {
    expect(deCentimos(1999)).toBe(19.99);
    expect(aCentimos('20.05')).toBe(2005);
    expect(aCentimos(20.05)).toBe(2005);
  });

  it('trata la ausencia de importe como cero', () => {
    expect(deCentimos(null)).toBe(0);
    expect(aCentimos(undefined)).toBe(0);
  });

  it('un texto que no es un número da cero en vez de NaN', () => {
    expect(aCentimos('abc')).toBe(0);
  });
});
