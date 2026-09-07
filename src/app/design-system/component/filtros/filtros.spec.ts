import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { BarraFiltros } from './barra-filtros';
import { FiltroSeleccion } from './filtro-seleccion';

const OPCIONES = [
  { value: 'gorros', label: 'Gorros', count: 12 },
  { value: 'bufandas', label: 'Bufandas', count: 3 },
];

describe('FiltroSeleccion', () => {
  it('no enseña las opciones hasta que se abre', async () => {
    await render(FiltroSeleccion, { inputs: { etiqueta: 'Categoría', opciones: OPCIONES } });

    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('publica la opción elegida y se cierra', async () => {
    const usuario = userEvent.setup({ delay: null });
    const { fixture } = await render(FiltroSeleccion, {
      inputs: { etiqueta: 'Categoría', opciones: OPCIONES },
    });

    await usuario.click(screen.getByRole('button', { name: /Categoría/ }));
    await usuario.click(screen.getByRole('button', { name: /Gorros/ }));

    expect(fixture.componentInstance.valor()).toBe('gorros');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  /** Filtrar con veinte opciones a ciegas es peor que no filtrar. */
  it('con muchas opciones trae su propio buscador', async () => {
    const usuario = userEvent.setup({ delay: null });
    const muchas = Array.from({ length: 12 }, (_, i) => ({
      value: String(i),
      label: `Opción ${i}`,
    }));
    await render(FiltroSeleccion, { inputs: { etiqueta: 'Categoría', opciones: muchas } });

    await usuario.click(screen.getByRole('button', { name: /Categoría/ }));
    const buscador = screen.getByRole('textbox');
    await usuario.type(buscador, 'Opción 3');

    expect(screen.getByRole('button', { name: 'Opción 3' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Opción 7' })).toBeNull();
  });

  it('la tecla de escape cierra el panel', async () => {
    const usuario = userEvent.setup({ delay: null });
    await render(FiltroSeleccion, { inputs: { etiqueta: 'Categoría', opciones: OPCIONES } });
    await usuario.click(screen.getByRole('button', { name: /Categoría/ }));

    await usuario.keyboard('{Escape}');

    expect(screen.queryByRole('listbox')).toBeNull();
  });
});

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
