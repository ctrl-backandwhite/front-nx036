import { render, screen } from '@testing-library/angular';
import { InsigniaDeEstado } from './insignia-de-estado';

/**
 * Las pruebas que MONTAN un componente tardan más de lo que Vitest espera por defecto (5 s) cuando hay
 * varios equipos compilando a la vez: el arranque de Angular compite por la máquina. El plazo se sube
 * aquí para que un fallo signifique lo que tiene que significar —que la lógica está mal— y no que el
 * ordenador iba cargado.
 */
vi.setConfig({ testTimeout: 30_000 });


describe('InsigniaDeEstado', () => {
  it('pinta el estado con el color que le corresponde', async () => {
    const { container } = await render(InsigniaDeEstado, { inputs: { estado: 'DELIVERED' } });

    expect(container.querySelector('span')?.className).toContain('badge-success');
  });

  /**
   * Un estado nuevo del backend tiene que VERSE: en blanco, la fila parecería no tener estado. Se
   * enseña el código crudo y con el color neutro.
   */
  it('un estado desconocido se enseña crudo y en gris', async () => {
    const { container } = await render(InsigniaDeEstado, { inputs: { estado: 'INVENTADO' } });

    expect(screen.getByText('INVENTADO')).toBeInTheDocument();
    expect(container.querySelector('span')?.className).toContain('badge-ghost');
  });
});
