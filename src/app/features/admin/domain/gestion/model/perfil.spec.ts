import {
  cambioDeContrasenaValido, esMovil, haceCuanto, iniciales, nombreDeIdioma, nombreDePais,
} from './perfil';

describe('nombreDePais', () => {
  it('traduce el país al idioma activo', () => {
    expect(nombreDePais('ES', 'es')).toBe('España');
    expect(nombreDePais('ES', 'pt')).toBe('Espanha');
  });

  it('cae al inglés cuando el idioma no tiene lista propia', () => {
    expect(nombreDePais('ES', 'nl')).toBe('Spain');
  });

  /** Un código sin nombre se enseña crudo: nunca un hueco donde debería ir el país. */
  it('devuelve el código cuando no conoce el país', () => {
    expect(nombreDePais('XX', 'es')).toBe('XX');
  });

  it('sin país pinta un guion', () => {
    expect(nombreDePais(undefined, 'es')).toBe('—');
  });
});

describe('nombreDeIdioma', () => {
  it('enseña el idioma en su propio nombre', () => {
    expect(nombreDeIdioma('zh')).toBe('中文');
  });

  it('devuelve el código si no lo conoce, y un guion si no hay ninguno', () => {
    expect(nombreDeIdioma('ja')).toBe('ja');
    expect(nombreDeIdioma(undefined)).toBe('—');
  });
});

describe('iniciales', () => {
  it('toma la inicial de las dos primeras piezas del nombre', () => {
    expect(iniciales('Ana Pérez')).toBe('AP');
  });

  it('parte también por la arroba, para poder usar el correo', () => {
    expect(iniciales('ana@nx036.local')).toBe('AN');
  });

  it('sin nombre devuelve un interrogante, para no dejar el círculo vacío', () => {
    expect(iniciales(undefined)).toBe('?');
    expect(iniciales('')).toBe('?');
  });
});

describe('esMovil', () => {
  it('reconoce los dispositivos de mano por su cadena de agente', () => {
    expect(esMovil('iPhone 15 · Safari')).toBe(true);
    expect(esMovil('Android · Chrome')).toBe(true);
    expect(esMovil('Macintosh · Firefox')).toBe(false);
  });
});

describe('haceCuanto', () => {
  const ahora = new Date('2026-03-05T12:00:00Z').getTime();

  /** «Hace 0 segundos» se lee como un fallo; «ahora» es lo que diría una persona. */
  it('por debajo del minuto dice ahora', () => {
    expect(haceCuanto(new Date('2026-03-05T11:59:30Z'), 'es', ahora, 'ahora')).toBe('ahora');
  });

  it('escribe minutos, horas y días en el idioma pedido', () => {
    expect(haceCuanto(new Date('2026-03-05T11:30:00Z'), 'es', ahora, 'ahora')).toContain('30');
    expect(haceCuanto(new Date('2026-03-05T09:00:00Z'), 'es', ahora, 'ahora')).toContain('3');
    expect(haceCuanto(new Date('2026-03-01T12:00:00Z'), 'es', ahora, 'ahora')).toContain('4');
  });

  it('llega hasta meses y años', () => {
    expect(haceCuanto(new Date('2025-12-05T12:00:00Z'), 'es', ahora, 'ahora')).toBeTruthy();
    expect(haceCuanto(new Date('2024-03-05T12:00:00Z'), 'es', ahora, 'ahora')).toBeTruthy();
  });
});

describe('cambioDeContrasenaValido', () => {
  it('exige el largo mínimo y que las dos coincidan', () => {
    expect(cambioDeContrasenaValido('contrasena-larga', 'contrasena-larga')).toBe(true);
    expect(cambioDeContrasenaValido('corta', 'corta')).toBe(false);
    expect(cambioDeContrasenaValido('contrasena-larga', 'otra-contrasena')).toBe(false);
  });
});
