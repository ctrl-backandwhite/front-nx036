import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Paginador } from './paginador';

describe('Paginador', () => {
  /** Con una sola página no hay nada que paginar: dos botones apagados solo estorban. */
  it('con una sola página no aparece', async () => {
    const { container } = await render(Paginador, {
      inputs: { pagina: 0, totalDePaginas: 1 },
    });
    expect(container.querySelector('nav')).toBeNull();
  });

  it('en la primera página no se puede retroceder', async () => {
    await render(Paginador, { inputs: { pagina: 0, totalDePaginas: 3 } });
    expect(screen.getAllByRole('button')[0]).toBeDisabled();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('en la última no se puede avanzar', async () => {
    await render(Paginador, { inputs: { pagina: 2, totalDePaginas: 3 } });
    const botones = screen.getAllByRole('button');
    expect(botones[1]).toBeDisabled();
  });

  it('avisa de la página pedida a quien lo monta', async () => {
    const vista = await render(Paginador, { inputs: { pagina: 1, totalDePaginas: 3 } });
    await userEvent.click(screen.getAllByRole('button')[1]);
    vista.fixture.detectChanges();
    expect(screen.getByText('3 / 3')).toBeInTheDocument();
  });
});
