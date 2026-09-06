import { describe, expect, it } from 'vitest';
import { nombreDeUbicacion } from './ubicacion';

describe('nombreDeUbicacion', () => {
  it('sin ubicación no escribe nada', () => {
    expect(nombreDeUbicacion(undefined)).toBe('');
    expect(nombreDeUbicacion('')).toBe('');
  });

  it('un código de país suelto se traduce a su nombre', () => {
    expect(nombreDeUbicacion('ES')).toContain('España');
    expect(nombreDeUbicacion('es')).toContain('España');
  });

  it('«ciudad, país» conserva la ciudad y traduce solo el código', () => {
    expect(nombreDeUbicacion('Utrecht, NL')).toMatch(/^Utrecht, /);
    expect(nombreDeUbicacion('Utrecht, NL')).not.toBe('Utrecht, NL');
  });

  /** El nombre de la ciudad lo escribe el transportista: no hay catálogo con el que contrastarlo. */
  it('el texto libre se deja tal cual', () => {
    expect(nombreDeUbicacion('Centro logístico de Shenzhen')).toBe('Centro logístico de Shenzhen');
  });

  it('un código que no está en el catálogo se devuelve como llegó', () => {
    expect(nombreDeUbicacion('ZZ')).toBe('ZZ');
  });
});
