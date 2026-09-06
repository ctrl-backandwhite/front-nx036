import {
  MetodoDePago,
  caducidadDeTarjeta,
  cobroConTarjetaDisponible,
  codigoDeBajaDeMetodoCompleto,
  soloDigitos,
  titularDeTarjetaValido,
} from './cobro';

const TARJETA: MetodoDePago = {
  referencia: 'pm_1',
  tipo: 'TARJETA',
  marca: 'visa',
  ultimosCuatro: '4242',
  mesDeCaducidad: 7,
  anioDeCaducidad: 2028,
  porDefecto: false,
};

describe('cobroConTarjetaDisponible', () => {
  it('hace falta que esté activo Y que haya clave publicable', () => {
    expect(cobroConTarjetaDisponible({ clavePublicable: 'pk_test', activo: true, pruebaGratisGastada: false })).toBe(true);
  });

  it.each([
    ['sin configuración', null],
    ['desactivado', { clavePublicable: 'pk_test', activo: false, pruebaGratisGastada: false }],
    ['sin clave', { clavePublicable: '', activo: true, pruebaGratisGastada: false }],
    ['con la clave en blanco', { clavePublicable: '   ', activo: true, pruebaGratisGastada: false }],
  ])('no está disponible %s', (_caso, config) => {
    expect(cobroConTarjetaDisponible(config)).toBe(false);
  });
});

describe('caducidadDeTarjeta', () => {
  it('rellena el mes con cero a la izquierda', () => {
    expect(caducidadDeTarjeta(TARJETA)).toBe('07/2028');
  });

  it('un método sin caducidad —PayPal— no la enseña', () => {
    expect(caducidadDeTarjeta({ referencia: 'paypal:1', tipo: 'PAYPAL', porDefecto: false })).toBe('');
  });
});

describe('titularDeTarjetaValido', () => {
  it('un titular con nombre vale', () => {
    expect(titularDeTarjetaValido('Ana Pérez')).toBe(true);
  });

  /** Sin titular la pasarela rechaza el cobro más tarde, cuando ya no hay nadie delante. */
  it('un titular vacío o de espacios no vale', () => {
    expect(titularDeTarjetaValido('')).toBe(false);
    expect(titularDeTarjetaValido('   ')).toBe(false);
  });
});

describe('codigoDeBajaDeMetodoCompleto', () => {
  it('acepta exactamente seis dígitos', () => {
    expect(codigoDeBajaDeMetodoCompleto('123456')).toBe(true);
    expect(codigoDeBajaDeMetodoCompleto(' 123456 ')).toBe(true);
  });

  it.each(['12345', '1234567', 'abcdef', ''])('rechaza «%s»', (codigo) => {
    expect(codigoDeBajaDeMetodoCompleto(codigo)).toBe(false);
  });
});

describe('soloDigitos', () => {
  it('descarta todo lo que no sea un dígito', () => {
    expect(soloDigitos('12-34 56a')).toBe('123456');
  });
});
