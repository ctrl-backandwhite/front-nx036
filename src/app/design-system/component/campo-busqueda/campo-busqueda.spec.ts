import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { CampoBusqueda } from './campo-busqueda';

describe('CampoBusqueda', () => {
  it('espera a la pausa antes de publicar lo tecleado', async () => {
    vi.useFakeTimers();
    const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    try {
      const { fixture } = await render(CampoBusqueda, { inputs: { retardo: 200 } });

      await usuario.type(screen.getByRole('searchbox'), 'gorro');
      // Todavía nada: quien lo monta no recibe una consulta por cada tecla.
      expect(fixture.componentInstance.valor()).toBe('');

      vi.advanceTimersByTime(200);
      expect(fixture.componentInstance.valor()).toBe('gorro');
    } finally {
      vi.useRealTimers();
    }
  });

  it('el aspa vacía al instante, sin esperar la pausa', async () => {
    const usuario = userEvent.setup({ delay: null });
    const { fixture } = await render(CampoBusqueda, { inputs: { valor: 'gorro' } });

    await usuario.click(screen.getByRole('button'));

    expect(fixture.componentInstance.valor()).toBe('');
    expect(screen.getByRole('searchbox')).toHaveValue('');
  });

  /**
   * `model().set()` no emite cuando el valor no cambia. Si la consulta anterior no llegó a aplicarse
   * —el enrutador descartó la navegación—, el campo ya tiene el texto dentro y volver a teclearlo no
   * avisaba a nadie: la búsqueda quedaba muerta y solo se recuperaba vaciando el campo.
   */
  it('vuelve a publicar aunque se teclee lo mismo que ya tenía', async () => {
    vi.useFakeTimers();
    const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    try {
      const buscado: string[] = [];
      await render(CampoBusqueda, {
        inputs: { retardo: 200, valor: 'gorro' },
        on: { busca: (texto: string) => buscado.push(texto) },
      });
      const campo = screen.getByRole('searchbox');

      await usuario.clear(campo);
      await usuario.type(campo, 'gorro');
      vi.advanceTimersByTime(200);

      expect(buscado.at(-1)).toBe('gorro');
    } finally {
      vi.useRealTimers();
    }
  });

  it('el aspa también avisa: vaciar es una búsqueda más', async () => {
    const usuario = userEvent.setup({ delay: null });
    const buscado: string[] = [];
    await render(CampoBusqueda, {
      inputs: { valor: 'gorro' },
      on: { busca: (texto: string) => buscado.push(texto) },
    });

    await usuario.click(screen.getByRole('button'));

    expect(buscado).toEqual(['']);
  });

  it('sin texto no ofrece el aspa: un botón que no hace nada estorba', async () => {
    await render(CampoBusqueda);

    expect(screen.queryByRole('button')).toBeNull();
  });
});
