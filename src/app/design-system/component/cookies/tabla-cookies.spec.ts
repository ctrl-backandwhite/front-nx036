import { render, screen } from '@testing-library/angular';
import { TablaCookies } from './tabla-cookies';

const FILAS = [
  {
    name: 'nx_device',
    owner: 'Propia (cookie)',
    purpose: 'Reconocer el dispositivo.',
    duration: '1 año',
    category: 'Necesaria',
  },
];

describe('TablaCookies', () => {
  /**
   * Describir solo categorías en abstracto no cumple: hay que poder cotejar cada cookie con lo que el
   * navegador guarda, y para eso tiene que estar su nombre, su dueño, su fin y su duración.
   */
  it('enseña cada cookie con su dueño, su fin y su duración', async () => {
    await render(TablaCookies, { inputs: { filas: FILAS } });

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('nx_device')).toBeInTheDocument();
    expect(screen.getByText('Propia (cookie)')).toBeInTheDocument();
    expect(screen.getByText('1 año')).toBeInTheDocument();
  });

  it('sin filas no pinta una tabla vacía', async () => {
    await render(TablaCookies, { inputs: { filas: [] } });

    expect(screen.queryByRole('table')).toBeNull();
  });
});
