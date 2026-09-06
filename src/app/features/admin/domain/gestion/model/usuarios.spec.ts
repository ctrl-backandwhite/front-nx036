import { Rol } from '@features/auth/domain/model/usuario';
import {
  UsuarioGestionado, estaBloqueado, fechaDeReferencia, paisesPresentes, pareceCorreo,
} from './usuarios';

function cuenta(cambios: Partial<UsuarioGestionado> = {}): UsuarioGestionado {
  return {
    id: '1', email: 'ana@nx036.local', rol: 'USER' as Rol, activo: true, accesosFallidos: 0,
    bloqueadoHasta: null, ultimoAcceso: null, creadoEl: null, ...cambios,
  };
}

describe('estaBloqueado', () => {
  const ahora = new Date('2026-03-05T10:00:00Z');

  it('está bloqueada mientras la fecha siga en el futuro', () => {
    expect(estaBloqueado(cuenta({ bloqueadoHasta: '2026-03-05T11:00:00Z' }), ahora)).toBe(true);
  });

  /**
   * La fecha se queda escrita cuando caduca. Comprobar solo que el campo tiene valor pintaría como
   * bloqueada para siempre una cuenta que se desbloqueó sola hace un mes.
   */
  it('deja de estarlo cuando la fecha ya pasó, aunque el campo siga escrito', () => {
    expect(estaBloqueado(cuenta({ bloqueadoHasta: '2026-03-05T09:00:00Z' }), ahora)).toBe(false);
  });

  it('sin fecha no está bloqueada', () => {
    expect(estaBloqueado(cuenta(), ahora)).toBe(false);
  });
});

describe('fechaDeReferencia', () => {
  it('enseña la de alta cuando la hay', () => {
    expect(fechaDeReferencia(cuenta({ creadoEl: '2026-01-01', ultimoAcceso: '2026-02-02' })))
      .toBe('2026-01-01');
  });

  it('cae al último acceso para las cuentas antiguas sin fecha de alta', () => {
    expect(fechaDeReferencia(cuenta({ ultimoAcceso: '2026-02-02' }))).toBe('2026-02-02');
  });

  it('devuelve nulo cuando no hay ninguna de las dos, para que la pantalla pinte un guion', () => {
    expect(fechaDeReferencia(cuenta())).toBeNull();
  });
});

describe('pareceCorreo', () => {
  it('acepta un correo con forma de correo', () => {
    expect(pareceCorreo(' alice@brand.com ')).toBe(true);
  });

  it('rechaza lo que no lo es, para no mandar una invitación al vacío', () => {
    expect(pareceCorreo('asdf')).toBe(false);
    expect(pareceCorreo('a@b')).toBe(false);
    expect(pareceCorreo('')).toBe(false);
  });
});

describe('paisesPresentes', () => {
  it('devuelve los países de la página, sin repetir y ordenados', () => {
    const lista = [cuenta({ pais: 'ES' }), cuenta({ pais: 'BR' }), cuenta({ pais: 'ES' }), cuenta()];

    expect(paisesPresentes(lista)).toEqual(['BR', 'ES']);
  });
});
