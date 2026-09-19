import { describe, expect, it } from 'vitest';
import { DatosDeSesion, RolDeSesion, SesionActual } from './sesion-actual';

/**
 * Lo que se prueba aquí es el REPARTO DE PAPELES, no el almacenamiento.
 *
 * <p>`puedeRevisarFichas` y `esAdministrador` se parecen tanto que es fácil que alguien sustituya uno
 * por otro «porque hacen lo mismo». No lo hacen: el día que coincidan, el revisor verá el desglose de
 * precio y podrá marcar «Verificado», que es justo lo que el rol existe para evitar.
 */
describe('SesionActual', () => {
  // Se instancia a mano en vez de pedirlo al TestBed: no inyecta nada, solo guarda señales, y así un
  // test puede mirar dos papeles sin reconfigurar el módulo de pruebas (que solo admite una vez).
  function sesion(rol: RolDeSesion): SesionActual {
    const servicio = new SesionActual();
    const datos: DatosDeSesion = { id: 'u1', rol, nombreVisible: 'Quien mira', pais: 'ES' };
    servicio.publica(datos);
    return servicio;
  }

  it('sin nadie dentro no hay papel ni permisos', () => {
    const servicio = new SesionActual();

    expect(servicio.haySesion()).toBe(false);
    expect(servicio.rol()).toBeNull();
    expect(servicio.esAdministrador()).toBe(false);
    expect(servicio.puedeRevisarFichas()).toBe(false);
  });

  it('el administrador puede revisar fichas, porque puede todo', () => {
    const servicio = sesion('ADMIN');

    expect(servicio.esAdministrador()).toBe(true);
    expect(servicio.puedeRevisarFichas()).toBe(true);
  });

  it('el revisor puede revisar fichas y NO es administrador', () => {
    const servicio = sesion('REVIEWER');

    expect(servicio.puedeRevisarFichas()).toBe(true);
    expect(servicio.esAdministrador()).toBe(false);
    // Tampoco es «personal interno» a efectos del panel: ahí solo entran ADMIN y OPERATOR.
    expect(servicio.esPersonalInterno()).toBe(false);
  });

  it('el operador es personal interno pero NO revisa fichas', () => {
    const servicio = sesion('OPERATOR');

    expect(servicio.esPersonalInterno()).toBe(true);
    expect(servicio.puedeRevisarFichas()).toBe(false);
  });

  it('ni el cliente ni el partner tocan las fichas', () => {
    expect(sesion('USER').puedeRevisarFichas()).toBe(false);
    expect(sesion('PARTNER').puedeRevisarFichas()).toBe(false);
  });

  it('«tiene» reconoce el papel nuevo', () => {
    expect(sesion('REVIEWER').tiene('ADMIN', 'REVIEWER')).toBe(true);
    expect(sesion('REVIEWER').tiene('ADMIN')).toBe(false);
  });
});
