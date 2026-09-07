import { describe, expect, it } from 'vitest';
import {
  API_INTERNA_POR_DEFECTO,
  VARIABLE_API_INTERNA,
  baseDelBackendAlConstruir,
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
});
