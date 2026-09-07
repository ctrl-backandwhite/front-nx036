import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { BarraFiltros } from './barra-filtros';

describe('BarraFiltros', () => {
  /**
   * En el móvil los filtros arrancan plegados: desplegados ocupaban media pantalla y el primer producto
   * quedaba fuera de la vista. La insignia con el número es lo que impide filtrar sin saberlo.
   */
  it('anuncia cuántos filtros hay puestos', async () => {
    await render(BarraFiltros, { inputs: { activos: 3 } });

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('arranca plegado y se despliega al pulsar el rótulo', async () => {
    const usuario = userEvent.setup({ delay: null });
    const { container } = await render(BarraFiltros);
    const desplegable = container.querySelector('[aria-expanded]');

    expect(desplegable).toHaveAttribute('aria-expanded', 'false');
    await usuario.click(desplegable as HTMLElement);
    expect(desplegable).toHaveAttribute('aria-expanded', 'true');
  });

  it('solo ofrece limpiar cuando hay algo que limpiar', async () => {
    const usuario = userEvent.setup({ delay: null });
    let limpiado = 0;
    const { fixture } = await render(BarraFiltros, {
      inputs: { hayActivos: false },
      on: { limpia: () => limpiado++ },
    });
    expect(screen.getAllByRole('button')).toHaveLength(1);

    fixture.componentRef.setInput('hayActivos', true);
    fixture.detectChanges();
    await usuario.click(screen.getAllByRole('button')[1]);

    expect(limpiado).toBe(1);
  });
});
