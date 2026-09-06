import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DistintivoArancel } from './distintivo-arancel';

describe('DistintivoArancel', () => {
  /**
   * Sin referencia —cesta vacía, o país que no cobra derecho por artículo— un mensaje sobre lo que
   * suma respecto de nada no significa nada, así que no se pinta.
   */
  it('sin importe que comparar no pinta nada', async () => {
    const { container } = await render(DistintivoArancel, {
      inputs: { arancel: { centimosExtra: null, cubierto: false } },
    });
    expect(container.textContent?.trim()).toBe('');
  });

  /**
   * El texto sale del diccionario y cambia con el idioma, así que se comprueba lo que DECIDE el
   * componente: que a cero se anuncia algo y no aparece el importe extra.
   */
  it('a cero anuncia que no suma arancel', async () => {
    const { container } = await render(DistintivoArancel, {
      inputs: { arancel: { centimosExtra: 0, cubierto: false } },
    });
    expect(container.textContent?.trim().length).toBeGreaterThan(0);
    expect(container.querySelector('button')).toBeNull();
  });

  it('con importe pide el filtro de su grupo', async () => {
    const filtra = vi.fn();
    await render(DistintivoArancel, {
      inputs: {
        arancel: { centimosExtra: 300, formateado: '3,00 €', cubierto: false, grupo: 'g1' },
      },
      on: { filtra },
    });
    await userEvent.click(screen.getByRole('button'));
    expect(filtra).toHaveBeenCalled();
  });
});
