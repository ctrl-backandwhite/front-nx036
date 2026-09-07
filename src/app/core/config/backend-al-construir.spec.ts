import { describe, expect, it } from 'vitest';
import {
  API_INTERNA_POR_DEFECTO,
  CABECERA_DE_COMPILACION,
  VARIABLE_API_INTERNA,
  VARIABLE_TESTIGO_DE_COMPILACION,
  baseDelBackendAlConstruir,
  cabecerasDeCompilacion,
} from './backend-al-construir';

describe('la dirección del backend al construir', () => {
  it('usa el nombre de servicio del clúster cuando nadie declara nada', () => {
    expect(baseDelBackendAlConstruir({})).toBe(API_INTERNA_POR_DEFECTO);
  });

  it('respeta la que declare el despliegue', () => {
    expect(baseDelBackendAlConstruir({ [VARIABLE_API_INTERNA]: 'http://localhost:18082' })).toBe(
      'http://localhost:18082',
    );
  });

  /**
   * Sin quitar la barra, la dirección quedaría con `//api/...`. Algunas pasarelas la aceptan y otras
   * responden 404, y el prerenderizado no avisa: escribe la página con sus marcadores de carga.
   */
  it('quita las barras del final', () => {
    expect(baseDelBackendAlConstruir({ [VARIABLE_API_INTERNA]: 'http://backend:18082///' })).toBe(
      'http://backend:18082',
    );
  });

  /**
   * El testigo con el que la compilación pide su cupo alto al backend. Sin variable no se manda
   * cabecera ninguna: una cadena vacía parecería configurada sin estarlo, y el backend la rechazaría
   * dejando la compilación exactamente igual de limitada pero con la falsa sensación de estar exenta.
   */
  describe('el testigo de compilación', () => {
    it('viaja en su cabecera cuando está puesto', () => {
      expect(cabecerasDeCompilacion({ [VARIABLE_TESTIGO_DE_COMPILACION]: 'abc123' })).toEqual({
        [CABECERA_DE_COMPILACION]: 'abc123',
      });
    });

    it('sin variable no se manda ninguna cabecera', () => {
      expect(cabecerasDeCompilacion({})).toEqual({});
    });

    it('en blanco cuenta como no configurado', () => {
      expect(cabecerasDeCompilacion({ [VARIABLE_TESTIGO_DE_COMPILACION]: '  ' })).toEqual({});
    });

    it('se recortan los espacios de alrededor', () => {
      expect(cabecerasDeCompilacion({ [VARIABLE_TESTIGO_DE_COMPILACION]: ' abc ' })).toEqual({
        [CABECERA_DE_COMPILACION]: 'abc',
      });
    });
  });
});
