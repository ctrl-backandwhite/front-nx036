import { Afiliado, PagoPendiente, destinoDelPago, exigeReferencia, tasaDeConversion } from './afiliados';

function pago(cambios: Partial<PagoPendiente> = {}): PagoPendiente {
  return {
    id: 'g1', idAfiliado: 'a1', importeCentimos: 5000, importeFormateado: '50,00 €',
    divisa: 'EUR', metodo: 'WALLET', comisiones: 3, ...cambios,
  };
}

describe('destinoDelPago', () => {
  it('compone la línea del banco con lo que haya', () => {
    const texto = destinoDelPago(pago({ metodo: 'BANK', titular: 'Ana', iban: 'ES00', bic: 'BIC1' }));

    expect(texto).toBe('Ana · ES00 · BIC1');
  });

  it('omite los datos bancarios que falten en vez de dejar separadores sueltos', () => {
    expect(destinoDelPago(pago({ metodo: 'BANK', iban: 'ES00' }))).toBe('ES00');
  });

  it('sin ningún dato bancario pinta un guion', () => {
    expect(destinoDelPago(pago({ metodo: 'BANK' }))).toBe('—');
  });

  it('para PayPal enseña el correo', () => {
    expect(destinoDelPago(pago({ metodo: 'PAYPAL', emailPaypal: 'a@b.com' }))).toBe('a@b.com');
  });

  /** La cartera no tiene destino que enseñar: es una línea traducida, no un número de cuenta. */
  it('la cartera no tiene destino', () => {
    expect(destinoDelPago(pago())).toBe('—');
  });
});

describe('exigeReferencia', () => {
  /** Es lo único que permite casar el apunte del banco con la comisión cuando alguien reclama. */
  it('la piden la transferencia y PayPal, no la cartera', () => {
    expect(exigeReferencia('BANK')).toBe(true);
    expect(exigeReferencia('PAYPAL')).toBe(true);
    expect(exigeReferencia('WALLET')).toBe(false);
  });
});

describe('tasaDeConversion', () => {
  function afiliado(clics: number, conversiones: number): Afiliado {
    return {
      id: 'a1', estado: 'ACTIVE', codigos: 1, clics, conversiones,
      pendienteCentimos: 0, aprobadoCentimos: 0, pagadoCentimos: 0,
    };
  }

  it('redondea el porcentaje de clics que acabaron en venta', () => {
    expect(tasaDeConversion(afiliado(200, 15))).toBe(8);
  });

  /** Sin clics no es cero por ciento: es que todavía no hay dato, y la pantalla pinta un guion. */
  it('devuelve nulo cuando no hubo clics', () => {
    expect(tasaDeConversion(afiliado(0, 0))).toBeNull();
  });
});
