import { TestBed } from '@angular/core/testing';
import { ALMACEN_LOCAL } from '../storage/almacen.port';
import { AlmacenMemoriaAdapter } from '../storage/almacen-memoria.adapter';
import { PaisDelUsuario } from './pais-del-usuario';

/**
 * El país de REGISTRO, que es el que decide el margen que se aplica a los precios.
 *
 * <p>Está en el núcleo y no en el contexto de la cuenta porque lo lee el cliente HTTP en cada petición.
 * Se guarda para que sobreviva a recargar la página: si se perdiera, la primera pantalla tras recargar
 * pediría precios sin país y saldrían con otro margen hasta que la sesión se recuperase.
 */
describe('PaisDelUsuario', () => {
  function monta(guardado?: string) {
    const almacen = new AlmacenMemoriaAdapter();
    if (guardado !== undefined) {
      almacen.guarda('nx036-country', guardado);
    }
    TestBed.configureTestingModule({
      providers: [PaisDelUsuario, { provide: ALMACEN_LOCAL, useValue: almacen }],
    });
    return { pais: TestBed.inject(PaisDelUsuario), almacen };
  }

  it('quien no ha entrado no tiene país, y entonces no se manda ninguno', () => {
    const { pais } = monta();

    expect(pais.codigo()).toBe('');
  });

  it('se recupera lo guardado: recargar no cambia los precios', () => {
    const { pais } = monta('ES');

    expect(pais.codigo()).toBe('ES');
  });

  it('normaliza a mayúsculas y sin espacios, porque el backend compara literal', () => {
    const { pais, almacen } = monta();

    pais.fija('  es ');

    expect(pais.codigo()).toBe('ES');
    expect(almacen.lee('nx036-country')).toBe('ES');
  });

  it('al salir de la sesión se borra de verdad, no se queda escrito', () => {
    const { pais, almacen } = monta('ES');

    pais.fija(null);

    expect(pais.codigo()).toBe('');
    /* Si se quedara guardado, quien entrase después en el mismo navegador vería precios calculados con
     * el país de la persona anterior. */
    expect(almacen.lee('nx036-country')).toBeNull();
  });

  it('una cadena de espacios cuenta como vacío', () => {
    const { pais } = monta('ES');

    pais.fija('   ');

    expect(pais.codigo()).toBe('');
  });
});
