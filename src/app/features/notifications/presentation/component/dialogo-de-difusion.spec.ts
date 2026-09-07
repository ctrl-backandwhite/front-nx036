import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { Difusion } from '../../domain/port/avisos.port';
import { DialogoDeDifusion } from './dialogo-de-difusion';

/**
 * Mandar un aviso desde el panel.
 *
 * <p>Es una de las poquísimas acciones de la aplicación que llega a TODAS las cuentas de golpe y no se
 * puede deshacer. De ahí las dos cosas que se fijan: que el destino por defecto sea explícito —«all», a
 * la vista, y no un vacío que signifique «todos» sin decirlo— y que no se pueda enviar con el título o
 * el cuerpo en blanco, ni con solo espacios.
 */
async function monta() {
  const mandados: Difusion[] = [];
  const cerrado = vi.fn();

  const vista = await render(DialogoDeDifusion, {
    on: { manda: (d: Difusion) => mandados.push(d), cierra: cerrado },
  });
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();

  return { vista, mandados, cerrado };
}

const campo = (id: string) =>
  document.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#difusion-${id}`)!;
const enviar = () => screen.getByRole('button', { name: /^Enviar$/ });

describe('DialogoDeDifusion', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  /** «all» a la vista, no un vacío que signifique «todos» sin decirlo. */
  it('el destino por defecto es explícito', async () => {
    await monta();

    expect(campo('destino').value).toBe('all');
    expect(screen.getByText(/"all" para enviar a todos/)).toBeInTheDocument();
  });

  it('no se puede enviar sin título ni cuerpo', async () => {
    await monta();

    expect(enviar()).toBeDisabled();
  });

  it('tampoco con solo espacios', async () => {
    await monta();

    await userEvent.type(campo('titulo'), '   ');
    await userEvent.type(campo('cuerpo'), '   ');

    /* Un aviso con el título en blanco llega a todas las cuentas como una notificación vacía, y no hay
     * forma de retirarla. */
    expect(enviar()).toBeDisabled();
  });

  it('con título y cuerpo se manda a quien diga el destino', async () => {
    const { mandados } = await monta();

    await userEvent.clear(campo('destino'));
    await userEvent.type(campo('destino'), 'ana@nx036.com');
    await userEvent.type(campo('titulo'), 'Mantenimiento');
    await userEvent.type(campo('cuerpo'), 'El sábado por la noche');
    await userEvent.click(enviar());

    expect(mandados).toEqual([
      { destino: 'ana@nx036.com', titulo: 'Mantenimiento', cuerpo: 'El sábado por la noche' },
    ]);
  });

  it('cancelar cierra sin mandar nada', async () => {
    const { mandados, cerrado } = await monta();
    await userEvent.type(campo('titulo'), 'Mantenimiento');
    await userEvent.type(campo('cuerpo'), 'El sábado');

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(cerrado).toHaveBeenCalled();
    expect(mandados).toEqual([]);
  });
});
