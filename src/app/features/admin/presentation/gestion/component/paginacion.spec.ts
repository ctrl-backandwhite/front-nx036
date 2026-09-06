import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { Paginacion } from './paginacion';

/**
 * Las pruebas que MONTAN un componente tardan más de lo que Vitest espera por defecto (5 s) cuando hay
 * varios equipos compilando a la vez: el arranque de Angular compite por la máquina. El plazo se sube
 * aquí para que un fallo signifique lo que tiene que significar —que la lógica está mal— y no que el
 * ordenador iba cargado.
 */
vi.setConfig({ testTimeout: 30_000 });


/**
 * Las flechas se buscan por su NOMBRE ACCESIBLE y no por el símbolo: llevan `aria-label` —«»» leído en
 * voz alta no significa nada— y la etiqueta SUSTITUYE al texto del botón como nombre.
 *
 * <p>Se busca por el NÚMERO con el que termina la etiqueta y no por el texto entero, porque la parte
 * traducida depende de si el diccionario ha llegado a cargarse en esa pasada. El número es lo que
 * distingue una flecha de la otra, y los otros dos botones —anterior y siguiente— no acaban en cifra.
 */
const flecha = (pagina: number) =>
  screen.getByRole('button', { name: new RegExp(`\\b${pagina}$`) });

describe('Paginacion', () => {
  it('dice en qué página se está, contando desde uno como quien la lee', async () => {
    await render(Paginacion, { inputs: { pagina: 2, paginas: 5 } });

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/5/)).toBeInTheDocument();
  });

  it('en la primera página no se puede retroceder', async () => {
    await render(Paginacion, { inputs: { pagina: 0, paginas: 3 } });

    expect(flecha(1)).toBeDisabled();
  });

  it('en la última no se puede avanzar', async () => {
    await render(Paginacion, { inputs: { pagina: 2, paginas: 3 } });

    expect(flecha(3)).toBeDisabled();
  });

  it('avisa de la página pedida al pulsar siguiente', async () => {
    const pedidas: number[] = [];
    await render(Paginacion, {
      inputs: { pagina: 0, paginas: 3 },
      on: { cambia: (p: number) => pedidas.push(p) },
    });

    await userEvent.click(screen.getByRole('button', { name: /next|siguiente/i }));

    expect(pedidas).toEqual([1]);
  });

  /** Recortar el rango aquí evita que una petición de la página -1 llegue a la red. */
  it('nunca emite una página fuera del rango', async () => {
    const pedidas: number[] = [];
    await render(Paginacion, {
      inputs: { pagina: 1, paginas: 3 },
      on: { cambia: (p: number) => pedidas.push(p) },
    });

    await userEvent.click(flecha(1));
    await userEvent.click(flecha(3));

    expect(pedidas).toEqual([0, 2]);
  });

  /**
   * Un listado vacío sigue siendo «página 1 de 1», nunca «1 de 0». Con una sola página las dos flechas
   * comparten nombre —las dos llevan a la primera, que es también la última—, así que se piden juntas.
   */
  it('con cero páginas sigue habiendo una', async () => {
    await render(Paginacion, { inputs: { pagina: 0, paginas: 0 } });

    const flechas = screen.getAllByRole('button', { name: /\b1$/ });
    expect(flechas).toHaveLength(2);
    for (const boton of flechas) {
      expect(boton).toBeDisabled();
    }
  });
});
