import { TestBed } from '@angular/core/testing';
import { PaisDelDispositivoAdapter } from './pais-del-dispositivo.adapter';

/**
 * Fija el idioma que declara el navegador y crea el adaptador con ese entorno.
 *
 * <p>Se REINICIA el módulo de pruebas en cada llamada: el adaptador lee `esNavegador()` al construirse,
 * así que hay que instanciarlo de nuevo por cada idioma. Sin el reinicio, la segunda llamada dentro de
 * la misma prueba falla con «el módulo ya está instanciado».
 */
function conIdiomaDelNavegador(valor: string | undefined): PaisDelDispositivoAdapter {
  TestBed.resetTestingModule();
  Object.defineProperty(navigator, 'language', { value: valor, configurable: true });
  TestBed.configureTestingModule({ providers: [PaisDelDispositivoAdapter] });
  return TestBed.inject(PaisDelDispositivoAdapter);
}

describe('PaisDelDispositivoAdapter', () => {
  const original = navigator.language;

  afterEach(() => {
    Object.defineProperty(navigator, 'language', { value: original, configurable: true });
    TestBed.resetTestingModule();
  });

  it('saca el país de la región del idioma', () => {
    expect(conIdiomaDelNavegador('es-ES').codigo()).toBe('ES');
    expect(conIdiomaDelNavegador('pt-br').codigo()).toBe('BR');
  });

  it('un idioma SIN región devuelve vacío, que es lo más común', () => {
    // «es» a secas no dice dónde está nadie. Ese vacío cae en el régimen por defecto, y por eso el
    // régimen decide qué texto se enseña y nunca qué cookies se encienden.
    expect(conIdiomaDelNavegador('es').codigo()).toBe('');
    expect(conIdiomaDelNavegador('').codigo()).toBe('');
    expect(conIdiomaDelNavegador(undefined).codigo()).toBe('');
  });
});
