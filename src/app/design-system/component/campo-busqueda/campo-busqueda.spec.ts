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

  it('sin texto no ofrece el aspa: un botón que no hace nada estorba', async () => {
    await render(CampoBusqueda);

    expect(screen.queryByRole('button')).toBeNull();
  });
});
