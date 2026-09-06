import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { BotonSubir } from './boton-subir';

/** Simula que la página está a cierta altura y avisa del desplazamiento. */
function desplazaHasta(altura: number): void {
  Object.defineProperty(window, 'scrollY', { value: altura, configurable: true });
  window.dispatchEvent(new Event('scroll'));
}

describe('BotonSubir', () => {
  afterEach(() => desplazaHasta(0));

  it('no estorba mientras se está arriba', async () => {
    await render(BotonSubir);

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('aparece al bajar más allá del umbral', async () => {
    const { fixture } = await render(BotonSubir, { inputs: { umbral: 100 } });

    desplazaHasta(150);
    fixture.detectChanges();

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('devuelve la página al principio', async () => {
    const usuario = userEvent.setup({ delay: null });
    const subir = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const { fixture } = await render(BotonSubir, { inputs: { umbral: 100 } });
    desplazaHasta(150);
    fixture.detectChanges();

    await usuario.click(screen.getByRole('button'));

    expect(subir).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    subir.mockRestore();
  });
});
