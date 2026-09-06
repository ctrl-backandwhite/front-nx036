import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { SelectorProvincia } from './selector-provincia';

const PROVINCIAS = [
  { code: 'CA', name: 'California' },
  { code: 'NY', name: 'New York' },
];

describe('SelectorProvincia', () => {
  it('con provincias conocidas ofrece un desplegable', async () => {
    const usuario = userEvent.setup({ delay: null });
    const { fixture } = await render(SelectorProvincia, {
      inputs: { provincias: PROVINCIAS, marcador: 'Provincia' },
    });

    await usuario.selectOptions(screen.getByRole('combobox'), 'CA');

    expect(fixture.componentInstance.valor()).toBe('CA');
  });

  /** Hay países todavía sin sembrar: sin texto libre no se podría escribir la dirección. */
  it('sin provincias cae a un campo de texto libre', async () => {
    const usuario = userEvent.setup({ delay: null });
    const { fixture } = await render(SelectorProvincia, { inputs: { marcador: 'Provincia' } });

    await usuario.type(screen.getByRole('textbox'), 'Cundinamarca');

    expect(fixture.componentInstance.valor()).toBe('Cundinamarca');
  });

  /**
   * Arrastrar el texto libre del país anterior haciéndose pasar por código de región haría que el
   * backend calculara mal el impuesto por estado.
   */
  it('limpia un valor que no es una de las provincias ofrecidas', async () => {
    const { fixture } = await render(SelectorProvincia, {
      inputs: { marcador: 'Provincia', valor: 'Cundinamarca' },
    });

    fixture.componentRef.setInput('provincias', PROVINCIAS);
    fixture.detectChanges();

    expect(fixture.componentInstance.valor()).toBe('');
  });
});
