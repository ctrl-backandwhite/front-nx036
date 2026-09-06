import {
  codigoDeBajaSuficiente,
  contrasenaCumpleLaPolitica,
  requisitosDeContrasena,
  siembraNombre,
} from './perfil';

describe('siembraNombre', () => {
  it('usa el nombre de pila cuando existe', () => {
    expect(siembraNombre('Ana', 'Pérez', '', 'Ana Pérez')).toBe('Ana');
  });

  /**
   * Las cuentas antiguas solo tienen nombre visible. Si el campo se dejara vacío, el primer guardado
   * BORRARÍA el nombre que tenían sin que nadie lo tocara.
   */
  it('siembra desde el nombre visible cuando no hay ninguna parte', () => {
    expect(siembraNombre(undefined, undefined, undefined, 'Ana Pérez')).toBe('Ana Pérez');
  });

  it('no siembra si ya hay apellidos: el nombre se dejó vacío a propósito', () => {
    expect(siembraNombre(undefined, 'Pérez', undefined, 'Ana Pérez')).toBe('');
    expect(siembraNombre(undefined, undefined, 'García', 'Ana Pérez')).toBe('');
  });

  it('sin nada de nada devuelve vacío', () => {
    expect(siembraNombre(undefined, undefined, undefined, undefined)).toBe('');
  });
});

describe('requisitosDeContrasena', () => {
  it('con una contraseña vacía no cumple ninguno', () => {
    expect(requisitosDeContrasena('').every((r) => !r.cumple)).toBe(true);
  });

  it('marca uno a uno los que se van cumpliendo', () => {
    const requisitos = requisitosDeContrasena('abcdefgh');
    const porClave = Object.fromEntries(requisitos.map((r) => [r.clave, r.cumple]));

    expect(porClave['profile.pwd_req_length']).toBe(true);
    expect(porClave['profile.pwd_req_lower']).toBe(true);
    expect(porClave['profile.pwd_req_upper']).toBe(false);
    expect(porClave['profile.pwd_req_digit']).toBe(false);
    expect(porClave['profile.pwd_req_symbol']).toBe(false);
  });

  it('devuelve claves de traducción, no textos: los idiomas son ocho', () => {
    expect(requisitosDeContrasena('x').map((r) => r.clave)).toEqual([
      'profile.pwd_req_length',
      'profile.pwd_req_upper',
      'profile.pwd_req_lower',
      'profile.pwd_req_digit',
      'profile.pwd_req_symbol',
    ]);
  });
});

describe('contrasenaCumpleLaPolitica', () => {
  it('acepta la que cumple las cinco reglas', () => {
    expect(contrasenaCumpleLaPolitica('Abcdef1!')).toBe(true);
  });

  it.each([
    ['corta', 'Ab1!'],
    ['sin mayúscula', 'abcdef1!'],
    ['sin minúscula', 'ABCDEF1!'],
    ['sin dígito', 'Abcdefg!'],
    ['sin símbolo', 'Abcdefg1'],
  ])('rechaza la %s', (_caso, clave) => {
    expect(contrasenaCumpleLaPolitica(clave)).toBe(false);
  });
});

describe('codigoDeBajaSuficiente', () => {
  it('a partir de cuatro caracteres se puede intentar', () => {
    expect(codigoDeBajaSuficiente('1234')).toBe(true);
    expect(codigoDeBajaSuficiente(' 123456 ')).toBe(true);
  });

  /** Estrecharlo más aquí bloquearía a quien recibió un código más corto: el que decide es el servidor. */
  it('por debajo de cuatro no se manda', () => {
    expect(codigoDeBajaSuficiente('123')).toBe(false);
    expect(codigoDeBajaSuficiente('   ')).toBe(false);
  });
});
