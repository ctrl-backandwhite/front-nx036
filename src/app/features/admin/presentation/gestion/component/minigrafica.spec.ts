import { render } from '@testing-library/angular';
import { Minigrafica } from './minigrafica';

/**
 * Las pruebas que MONTAN un componente tardan más de lo que Vitest espera por defecto (5 s) cuando hay
 * varios equipos compilando a la vez: el arranque de Angular compite por la máquina. El plazo se sube
 * aquí para que un fallo signifique lo que tiene que significar —que la lógica está mal— y no que el
 * ordenador iba cargado.
 */
vi.setConfig({ testTimeout: 30_000 });


describe('Minigrafica', () => {
  it('dibuja la línea y su relleno con el color del tema', async () => {
    const { container } = await render(Minigrafica, {
      inputs: { datos: [1, 4, 2, 8], tono: 'success' },
    });

    const lineas = container.querySelectorAll('polyline');
    expect(lineas).toHaveLength(2);
    expect(lineas[0].getAttribute('stroke')).toBe('var(--color-success)');
    expect(lineas[0].getAttribute('points')?.split(' ')).toHaveLength(4);
  });

  /** El dato ya está escrito al lado en cifras: anunciarlo dos veces estorba al lector de pantalla. */
  it('es decorativa: no se anuncia', async () => {
    const { container } = await render(Minigrafica, { inputs: { datos: [1, 2] } });

    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  /** Una serie plana dividiría por cero y la línea desaparecería. */
  it('una serie sin variación sigue dibujando la línea', async () => {
    const { container } = await render(Minigrafica, { inputs: { datos: [5, 5, 5] } });

    expect(container.querySelector('polyline')?.getAttribute('points')).toContain(',');
  });

  it('sin datos no dibuja puntos', async () => {
    const { container } = await render(Minigrafica, { inputs: { datos: [] } });

    expect(container.querySelector('polyline')?.getAttribute('points')).toBe('');
  });
});
