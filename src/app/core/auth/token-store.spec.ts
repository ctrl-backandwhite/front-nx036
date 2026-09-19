import { TestBed } from '@angular/core/testing';
import { ALMACEN_LOCAL } from '../storage/almacen.port';
import { AlmacenMemoriaAdapter } from '../storage/almacen-memoria.adapter';
import { TokenStore } from './token-store';

const ACCESO = 'nx-access-token';
const REFRESCO = 'nx-refresh-token';

/**
 * El par de credenciales de la sesión.
 *
 * <p>Lo que se protege aquí es que nunca convivan un acceso NUEVO y un refresco VIEJO. Esa pareja
 * descasada no falla al guardarse: funciona lo que dura el acceso —una hora— y revienta en la primera
 * renovación, cuando el backend rechaza el refresco con un 401 y la aplicación echa a quien estaba
 * navegando. Pasó el 17-sep-2026 y no dejó rastro en el servidor.
 */
describe('TokenStore', () => {
  function monta(inicial?: { acceso?: string; refresco?: string }) {
    const almacen = new AlmacenMemoriaAdapter();
    if (inicial?.acceso) {
      almacen.guarda(ACCESO, inicial.acceso);
    }
    if (inicial?.refresco) {
      almacen.guarda(REFRESCO, inicial.refresco);
    }
    TestBed.configureTestingModule({
      providers: [TokenStore, { provide: ALMACEN_LOCAL, useValue: almacen }],
    });
    return { almacen, tokens: TestBed.inject(TokenStore) };
  }

  it('guarda las dos credenciales cuando llegan las dos', () => {
    const { almacen, tokens } = monta();

    tokens.guarda('acceso-1', 'refresco-1');

    expect(almacen.lee(ACCESO)).toBe('acceso-1');
    expect(almacen.lee(REFRESCO)).toBe('refresco-1');
    expect(tokens.acceso()).toBe('acceso-1');
    expect(tokens.refresco()).toBe('refresco-1');
  });

  /**
   * El defecto que cerró sesiones: sin esto, el refresco de julio sobrevivía a un acceso nuevo de
   * septiembre. En producción se manifiesta una hora después de entrar, muy lejos de aquí.
   */
  it('sin refresco BORRA el que hubiera, en vez de dejar una pareja descasada', () => {
    const { almacen, tokens } = monta({ acceso: 'acceso-viejo', refresco: 'refresco-viejo' });

    tokens.guarda('acceso-nuevo', null);

    expect(almacen.lee(ACCESO)).toBe('acceso-nuevo');
    expect(almacen.lee(REFRESCO)).toBeNull();
    expect(tokens.refresco()).toBeNull();
  });

  it('tampoco lo conserva cuando no se pasa el argumento', () => {
    const { almacen, tokens } = monta({ refresco: 'refresco-viejo' });

    tokens.guarda('acceso-nuevo');

    expect(almacen.lee(REFRESCO)).toBeNull();
    expect(tokens.refresco()).toBeNull();
  });

  it('al limpiar no queda ninguna de las dos', () => {
    const { almacen, tokens } = monta({ acceso: 'a', refresco: 'r' });

    tokens.limpia();

    expect(almacen.lee(ACCESO)).toBeNull();
    expect(almacen.lee(REFRESCO)).toBeNull();
    expect(tokens.haySesion()).toBe(false);
  });

  it('hay sesión mientras haya acceso, lo diga quien lo diga el backend', () => {
    const { tokens } = monta();

    expect(tokens.haySesion()).toBe(false);
    tokens.guarda('acceso-1', 'refresco-1');
    expect(tokens.haySesion()).toBe(true);
  });
});
