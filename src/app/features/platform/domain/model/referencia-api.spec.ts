import { INDICE, soloLaExplicacion } from './referencia-api';
import { APARTADOS_DE_CATALOGO } from './referencia-catalogo';

describe('soloLaExplicacion', () => {
  it('quita el nombre cuando el texto traducido lo repite', () => {
    expect(soloLaExplicacion('catalog.read — leer el catálogo')).toBe('leer el catálogo');
  });

  it('deja el texto tal cual si no lleva el guion largo', () => {
    expect(soloLaExplicacion('Leer el catálogo')).toBe('Leer el catálogo');
  });

  it('no confunde un guion corriente con el separador', () => {
    expect(soloLaExplicacion('alta-baja de productos')).toBe('alta-baja de productos');
  });
});

/**
 * La referencia es DATO, y por eso se puede comprobar sola. Estas pruebas son la razón práctica de
 * haberla sacado del marcado: mientras eran 1143 líneas de plantilla, que un apartado se quedara sin
 * entrada en el índice —o que se documentara dos veces el mismo endpoint— no lo detectaba nadie.
 */
describe('coherencia de la referencia de la API', () => {
  it('cada apartado del catálogo tiene su entrada en el índice', () => {
    const enElIndice = new Set(INDICE.map((entrada) => entrada.id));
    for (const apartado of APARTADOS_DE_CATALOGO) {
      expect(enElIndice.has(apartado.id)).toBe(true);
    }
  });

  it('no hay entradas repetidas en el índice', () => {
    const ids = INDICE.map((entrada) => entrada.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ningún endpoint está documentado dos veces dentro del mismo apartado', () => {
    for (const apartado of APARTADOS_DE_CATALOGO) {
      const firmas = apartado.endpoints.map((e) => `${e.metodo} ${e.ruta}`);
      expect(new Set(firmas).size).toBe(firmas.length);
    }
  });

  it('todos los endpoints llevan método y ruta absoluta', () => {
    for (const apartado of APARTADOS_DE_CATALOGO) {
      for (const endpoint of apartado.endpoints) {
        expect(endpoint.metodo).toMatch(/^(GET|POST|PUT|DELETE|PATCH)$/);
        expect(endpoint.ruta.startsWith('/')).toBe(true);
      }
    }
  });

  it('todos los apartados traen al menos un endpoint', () => {
    for (const apartado of APARTADOS_DE_CATALOGO) {
      expect(apartado.endpoints.length).toBeGreaterThan(0);
    }
  });
});
