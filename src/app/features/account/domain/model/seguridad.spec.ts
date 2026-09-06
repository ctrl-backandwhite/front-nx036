import { codigoTotpCompleto, esDispositivoMovil } from './seguridad';

describe('esDispositivoMovil', () => {
  it.each(['iPhone 15', 'Android 14', 'iPad Pro', 'Mobile Safari'])(
    'reconoce «%s» como móvil',
    (dispositivo) => {
      expect(esDispositivoMovil(dispositivo)).toBe(true);
    },
  );

  it.each(['Chrome en Windows', 'Firefox en Linux', ''])(
    'trata «%s» como ordenador',
    (dispositivo) => {
      expect(esDispositivoMovil(dispositivo)).toBe(false);
    },
  );
});

describe('codigoTotpCompleto', () => {
  it('los códigos de un solo uso son de seis dígitos', () => {
    expect(codigoTotpCompleto('123456')).toBe(true);
    expect(codigoTotpCompleto(' 123456 ')).toBe(true);
  });

  it.each(['12345', '1234567', '12345a', ''])('rechaza «%s»', (codigo) => {
    expect(codigoTotpCompleto(codigo)).toBe(false);
  });
});
