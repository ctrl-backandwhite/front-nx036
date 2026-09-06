import { render, screen } from '@testing-library/angular';
import { GuiaPuntos } from './guia-puntos';

describe('GuiaPuntos', () => {
  /**
   * Lo único que se le pide es que NO exista para quien escucha la página: es adorno, y un lector de
   * pantalla anunciando la línea de puntos entre cada concepto y su importe estorbaría.
   */
  it('queda fuera del árbol accesible', async () => {
    const { container } = await render(
      '<nx-guia-puntos /><span>Envío</span>',
      { imports: [GuiaPuntos] },
    );

    expect(screen.getByText('Envío')).toBeInTheDocument();
    expect(container.querySelector('nx-guia-puntos')).toHaveAttribute('aria-hidden', 'true');
  });
});
