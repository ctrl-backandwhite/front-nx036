import { TestBed } from '@angular/core/testing';
import { ALMACEN_LOCAL } from '@core/storage/almacen.port';
import { AlmacenMemoriaAdapter } from '@core/storage/almacen-memoria.adapter';
import { PaisDelUsuario } from '@core/http/pais-del-usuario';
import { SesionActual } from '@core/auth/sesion-actual';
import { Usuario } from '../../domain/model/usuario';
import { SesionStore } from './sesion.store';

/**
 * Quién ha entrado, y las TRES cosas que se mueven a la vez cuando cambia.
 *
 * <p>Publicar la sesión no es solo guardar un objeto: además fija el país —del que sale el margen que se
 * aplica a los precios— y avisa al resto de la aplicación por `SesionActual`, que es lo que mira la
 * cabecera. Cuando alguna de las tres se queda atrás, el síntoma no señala aquí: son precios de otro
 * país, o una cabecera que sigue saludando a quien ya se fue.
 */
describe('SesionStore', () => {
  const ANA: Usuario = {
    id: 'u1',
    email: 'ana@nx036.com',
    rol: 'USER',
    activo: true,
    nombreVisible: 'Ana',
    pais: 'ES',
    creadoEl: '2026-01-01T00:00:00Z',
    permisos: [],
  };

  function monta() {
    TestBed.configureTestingModule({
      providers: [
        SesionStore,
        PaisDelUsuario,
        SesionActual,
        { provide: ALMACEN_LOCAL, useValue: new AlmacenMemoriaAdapter() },
      ],
    });
    return {
      sesion: TestBed.inject(SesionStore),
      pais: TestBed.inject(PaisDelUsuario),
      actual: TestBed.inject(SesionActual),
    };
  }

  /**
   * «No hay sesión» y «todavía no se sabe» son cosas distintas. Confundirlas hace parpadear la cabecera
   * de toda la web: se pinta «Entrar» durante el instante que tarda en resolverse y luego se cambia.
   */
  it('al arrancar no se sabe quién mira, que no es lo mismo que no haber nadie', () => {
    const { sesion } = monta();

    expect(sesion.resuelta()).toBe(false);
    expect(sesion.haySesion()).toBe(false);
  });

  it('publicar la sesión fija además el país, del que sale el margen', () => {
    const { sesion, pais } = monta();

    sesion.fija(ANA);

    expect(sesion.haySesion()).toBe(true);
    expect(sesion.resuelta()).toBe(true);
    expect(pais.codigo()).toBe('ES');
  });

  it('y avisa al resto de la aplicación de quién es', () => {
    const { sesion, actual } = monta();

    sesion.fija(ANA);

    expect(actual.datos()).toMatchObject({ id: 'u1', rol: 'USER', nombreVisible: 'Ana' });
  });

  it('cerrar sesión borra el país: los precios no pueden quedarse en los del anterior', () => {
    const { sesion, pais, actual } = monta();
    sesion.fija(ANA);

    sesion.limpia();

    expect(sesion.haySesion()).toBe(false);
    expect(pais.codigo()).toBe('');
    expect(actual.datos()).toBeNull();
    /* Sigue RESUELTA: se sabe perfectamente que no hay nadie. Volver a «no se sabe» haría parpadear la
     * cabecera otra vez, ahora al salir. */
    expect(sesion.resuelta()).toBe(true);
  });

  it('el operador es también el administrador, pero no al revés', () => {
    const { sesion } = monta();

    sesion.fija({ ...ANA, rol: 'OPERATOR' });
    expect(sesion.esOperador()).toBe(true);
    expect(sesion.esAdministrador()).toBe(false);

    sesion.fija({ ...ANA, rol: 'ADMIN' });
    expect(sesion.esAdministrador()).toBe(true);
    expect(sesion.esOperador()).toBe(true);
  });

  it('un cliente no es ninguna de las dos cosas', () => {
    const { sesion } = monta();

    sesion.fija(ANA);

    expect(sesion.esAdministrador()).toBe(false);
    expect(sesion.esOperador()).toBe(false);
    expect(sesion.tiene('PARTNER')).toBe(false);
    expect(sesion.tiene('USER', 'PARTNER')).toBe(true);
  });

  it('sin país de registro no se arrastra el del anterior', () => {
    const { sesion, pais } = monta();
    sesion.fija(ANA);

    sesion.fija({ ...ANA, id: 'u2', pais: undefined });

    expect(pais.codigo()).toBe('');
  });
});
