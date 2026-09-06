import { describe, expect, it } from 'vitest';
import { destinoPorDefecto, destinoSeguro, pareceCredencial } from './acceso-social';

describe('pareceCredencial', () => {
  it('acepta lo que tiene forma de credencial firmada', () => {
    expect(pareceCredencial('cabecera.contenido.firma')).toBe(true);
    expect(pareceCredencial('a-b_c.d-e_f.g-h_i')).toBe(true);
  });

  it('rechaza lo que alguien podría sembrar a mano en el fragmento', () => {
    expect(pareceCredencial(null)).toBe(false);
    expect(pareceCredencial('')).toBe(false);
    expect(pareceCredencial('sin-puntos')).toBe(false);
    expect(pareceCredencial('solo.dos')).toBe(false);
    expect(pareceCredencial('con espacio.en.medio')).toBe(false);
  });
});

describe('destinoSeguro', () => {
  it('deja volver a una ruta interna', () => {
    expect(destinoSeguro('/checkout')).toBe('/checkout');
  });

  it('rechaza la dirección absoluta disfrazada de relativa', () => {
    // «//otra-web.com» es absoluta: aceptarla convertiría el retorno en un redirector abierto.
    expect(destinoSeguro('//otra-web.com')).toBeNull();
  });

  it('rechaza lo que no empieza por barra y el propio acceso', () => {
    expect(destinoSeguro('https://otra-web.com')).toBeNull();
    expect(destinoSeguro('/login')).toBeNull();
    expect(destinoSeguro(null)).toBeNull();
  });
});

describe('destinoPorDefecto', () => {
  it('deja al personal de la casa en el panel y a quien compra en la portada', () => {
    expect(destinoPorDefecto('ADMIN')).toBe('/admin');
    expect(destinoPorDefecto('OPERATOR')).toBe('/admin');
    expect(destinoPorDefecto('USER')).toBe('/');
    expect(destinoPorDefecto(undefined)).toBe('/');
  });
});
