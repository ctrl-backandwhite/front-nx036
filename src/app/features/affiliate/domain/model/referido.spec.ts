import { describe, expect, it } from 'vitest';
import { direccionSinReferido, seLePuedeAtribuir } from './referido';

describe('reglas del referido', () => {
  describe('seLePuedeAtribuir', () => {
    it('a un cliente sí', () => {
      expect(seLePuedeAtribuir('USER')).toBe(true);
      expect(seLePuedeAtribuir('PARTNER')).toBe(true);
    });

    /** El personal de la casa no puede traerse a sí mismo por un enlace de referido. */
    it('al personal de la casa no', () => {
      expect(seLePuedeAtribuir('ADMIN')).toBe(false);
      expect(seLePuedeAtribuir('OPERATOR')).toBe(false);
    });

    it('sin rol conocido tampoco', () => {
      expect(seLePuedeAtribuir(undefined)).toBe(false);
    });
  });

  describe('direccionSinReferido', () => {
    it('quita el parámetro y deja la dirección limpia', () => {
      expect(direccionSinReferido('/catalog?ref=ANA')).toBe('/catalog');
    });

    /** Los demás parámetros son del sitio: borrarlos rompería filtros y enlaces internos. */
    it('conserva el resto de parámetros y el ancla', () => {
      expect(direccionSinReferido('/catalog?ref=ANA&orden=precio#lista')).toBe(
        '/catalog?orden=precio#lista',
      );
    });

    it('una dirección sin referido no se toca', () => {
      expect(direccionSinReferido('/catalog?orden=precio')).toBe('/catalog?orden=precio');
      expect(direccionSinReferido('/catalog')).toBe('/catalog');
    });
  });
});
