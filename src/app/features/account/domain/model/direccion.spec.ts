import {
  DIRECCION_VACIA,
  Direccion,
  aDatosDeDireccion,
  codigoPostalInvalido,
  direccionCompleta,
} from './direccion';

const GUARDADA: Direccion = {
  id: 'dir-1',
  etiqueta: 'Casa',
  nombreCompleto: 'Ana Pérez',
  telefono: '+34600123456',
  linea1: 'Calle Mayor 1',
  linea2: '3º B',
  ciudad: 'Madrid',
  provincia: 'M',
  codigoPostal: '28001',
  pais: 'ES',
  porDefecto: true,
  creadaEl: '2026-01-01T00:00:00Z',
};

describe('aDatosDeDireccion', () => {
  it('devuelve solo los campos editables, sin identificador ni fecha', () => {
    const datos = aDatosDeDireccion(GUARDADA);

    expect(datos).toEqual({
      etiqueta: 'Casa',
      nombreCompleto: 'Ana Pérez',
      telefono: '+34600123456',
      linea1: 'Calle Mayor 1',
      linea2: '3º B',
      ciudad: 'Madrid',
      provincia: 'M',
      codigoPostal: '28001',
      pais: 'ES',
      porDefecto: true,
    });
  });

  it('convierte los opcionales ausentes en cadenas vacías, no en indefinidos', () => {
    const datos = aDatosDeDireccion({
      ...GUARDADA,
      etiqueta: undefined,
      telefono: undefined,
      linea2: undefined,
      provincia: undefined,
      codigoPostal: undefined,
    });

    expect(datos.etiqueta).toBe('');
    expect(datos.telefono).toBe('');
    expect(datos.linea2).toBe('');
    expect(datos.provincia).toBe('');
    expect(datos.codigoPostal).toBe('');
  });
});

describe('direccionCompleta', () => {
  const completa = { ...DIRECCION_VACIA, nombreCompleto: 'Ana', linea1: 'Calle', ciudad: 'Madrid', pais: 'ES' };

  it('acepta la dirección con los cuatro campos imprescindibles', () => {
    expect(direccionCompleta(completa)).toBe(true);
  });

  it('la provincia y el código postal no son imprescindibles', () => {
    expect(direccionCompleta({ ...completa, provincia: '', codigoPostal: '' })).toBe(true);
  });

  it.each(['nombreCompleto', 'linea1', 'ciudad', 'pais'] as const)(
    'rechaza la dirección sin %s',
    (campo) => {
      expect(direccionCompleta({ ...completa, [campo]: '' })).toBe(false);
    },
  );

  /** Un nombre de solo espacios pasaba la comprobación y el servidor lo rechazaba después. */
  it('no se deja engañar por espacios en blanco', () => {
    expect(direccionCompleta({ ...completa, nombreCompleto: '   ' })).toBe(false);
  });
});

describe('codigoPostalInvalido', () => {
  const espana = { requerido: true, patron: '\\d{5}', ejemplo: '28001' };

  it('acepta el que encaja con el formato del país', () => {
    expect(codigoPostalInvalido('28001', espana)).toBe(false);
  });

  it('avisa cuando no encaja', () => {
    expect(codigoPostalInvalido('2800', espana)).toBe(true);
  });

  /** Con el campo vacío aún se está escribiendo: regañar ahí es regañar por adelantado. */
  it('con el campo vacío no dice nada', () => {
    expect(codigoPostalInvalido('', espana)).toBe(false);
    expect(codigoPostalInvalido('   ', espana)).toBe(false);
  });

  it('sin formato conocido no comprueba nada', () => {
    expect(codigoPostalInvalido('lo-que-sea', null)).toBe(false);
    expect(codigoPostalInvalido('lo-que-sea', { requerido: false })).toBe(false);
    expect(codigoPostalInvalido('lo-que-sea', { requerido: true })).toBe(false);
  });

  /** Los códigos con espacio interior —Reino Unido, Países Bajos— se comparan normalizados. */
  it('normaliza los espacios de más antes de comparar', () => {
    const reinoUnido = { requerido: true, patron: '[A-Z]{1,2}\\d[A-Z\\d]? \\d[A-Z]{2}', ejemplo: 'SW1A 1AA' };

    expect(codigoPostalInvalido('SW1A  1AA', reinoUnido)).toBe(false);
    expect(codigoPostalInvalido('sw1a 1aa', reinoUnido)).toBe(false);
  });
});
