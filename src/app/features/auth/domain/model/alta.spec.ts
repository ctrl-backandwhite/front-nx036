import { describe, expect, it } from 'vitest';
import { BorradorDeAlta, aSolicitudDeAlta, queFaltaParaElAlta } from './alta';

/**
 * Reglas puras: se prueban SIN Angular, con objetos y nada más. Si para comprobar una de estas hiciera
 * falta montar un componente, la regla estaría en el sitio equivocado.
 */
const base: BorradorDeAlta = {
  email: '  alguien@ejemplo.com  ',
  contrasena: 'Segura123!',
  repiteContrasena: 'Segura123!',
  nombre: ' Ana ',
  primerApellido: '',
  segundoApellido: '   ',
  empresa: 'NX036',
  pais: 'ES',
  idioma: 'es',
  aceptaCondiciones: true,
  versionDeCondiciones: '2026-08-15',
  aceptaComunicaciones: false,
};

describe('queFaltaParaElAlta', () => {
  it('no pone pegas cuando está todo', () => {
    expect(queFaltaParaElAlta(base, true, true)).toBeNull();
  });

  it('avisa antes que nada de que las dos contraseñas no coinciden', () => {
    const borrador = { ...base, repiteContrasena: 'Otra123!' };
    expect(queFaltaParaElAlta(borrador, true, true)).toBe('contrasenas-no-coinciden');
  });

  it('rechaza una contraseña que no cumple la política', () => {
    expect(queFaltaParaElAlta(base, false, true)).toBe('contrasena-debil');
  });

  it('no deja crear la cuenta sin aceptar las condiciones', () => {
    const borrador = { ...base, aceptaCondiciones: false };
    expect(queFaltaParaElAlta(borrador, true, true)).toBe('condiciones-sin-aceptar');
  });

  it('espera a que el reto esté resuelto', () => {
    expect(queFaltaParaElAlta(base, true, false)).toBe('captcha-pendiente');
  });

  it('devuelve un solo motivo, el primero en orden de lectura', () => {
    const borrador = { ...base, repiteContrasena: 'x', aceptaCondiciones: false };
    expect(queFaltaParaElAlta(borrador, false, false)).toBe('contrasenas-no-coinciden');
  });
});

describe('aSolicitudDeAlta', () => {
  it('recorta los espacios y convierte lo vacío en ausencia', () => {
    const solicitud = aSolicitudDeAlta(base);

    expect(solicitud.email).toBe('alguien@ejemplo.com');
    expect(solicitud.nombre).toBe('Ana');
    // Cadena vacía y campo ausente no son lo mismo: la primera se guardaría como un apellido en blanco.
    expect(solicitud.primerApellido).toBeUndefined();
    expect(solicitud.segundoApellido).toBeUndefined();
  });

  it('no toca la contraseña: recortarla cambiaría la credencial', () => {
    const solicitud = aSolicitudDeAlta({ ...base, contrasena: ' Con Espacios ' });
    expect(solicitud.contrasena).toBe(' Con Espacios ');
  });

  it('acredita la versión de condiciones aceptada y el consentimiento comercial por separado', () => {
    const solicitud = aSolicitudDeAlta({ ...base, aceptaComunicaciones: true });
    expect(solicitud.aceptaCondiciones).toBe(true);
    expect(solicitud.versionDeCondiciones).toBe('2026-08-15');
    expect(solicitud.aceptaComunicaciones).toBe(true);
  });
});
