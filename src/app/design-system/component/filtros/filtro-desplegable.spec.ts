import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { FiltroDesplegable, OpcionDeFiltro } from './filtro-desplegable';

/**
 * El chip de filtro del catálogo: el que abre un panel con las opciones.
 *
 * <p>Es la pieza que reemplazó a los desplegables nativos, así que tiene que hacer a mano lo que el
 * navegador daba gratis — y eso es exactamente lo que se fija aquí:
 *
 * <ul>
 *   <li>«sin filtro» es NULO, no cadena vacía: es lo que permite a la pantalla de arriba distinguir
 *       «todos» de «un valor vacío», y de ello depende si el filtro viaja al servidor;
 *   <li>el buscador del panel aparece SOLO cuando hay muchas opciones —con cuatro estorba— y se VACÍA
 *       al abrir: la consulta de la vez anterior escondía opciones sin explicar por qué;
 *   <li>las flechas recorren las opciones, que es lo único que hace usable el panel sin ratón.
 * </ul>
 */
const POCAS: readonly OpcionDeFiltro[] = [
  { valor: 'es', etiqueta: 'España', cuantos: 12 },
  { valor: 'fr', etiqueta: 'Francia' },
  { valor: 'it', etiqueta: 'Italia' },
];

const MUCHAS: readonly OpcionDeFiltro[] = Array.from({ length: 12 }, (_, i) => ({
  valor: `c${i}`,
  etiqueta: `Categoría ${i}`,
}));

async function monta(opciones: readonly OpcionDeFiltro[] = POCAS, valor: string | null = null) {
  const vista = await render(FiltroDesplegable, {
    inputs: { etiqueta: 'País', opciones, valor },
  });
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();

  const asienta = async () => {
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
  };

  /* `valor` es un `model()`: la elección se lee del propio componente, que es también por donde sale
   * hacia el padre. Leerla ahí prueba lo mismo que escuchar la salida y no depende de cómo tipe el
   * banco de pruebas las salidas de doble vía. */
  const elegido = () => vista.fixture.componentInstance.valor();

  return { vista, asienta, elegido };
}

const chip = () => screen.getAllByRole('button', { name: 'País' })[0];

describe('FiltroDesplegable', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('nace cerrado: solo se ve el chip', async () => {
    await monta();

    expect(screen.queryAllByRole('option')).toEqual([]);
  });

  it('al pulsarlo se abren las opciones', async () => {
    const { asienta } = await monta();

    await userEvent.click(chip());
    await asienta();

    expect(screen.getByRole('option', { name: /España/ })).toBeInTheDocument();
    expect(screen.getAllByRole('option').length).toBe(POCAS.length + 1);
  });

  it('el recuento de resultados se pinta solo cuando viene', async () => {
    const { asienta } = await monta();
    await userEvent.click(chip());
    await asienta();

    expect(screen.getByRole('option', { name: /España/ }).textContent).toContain('12');
    expect(screen.getByRole('option', { name: /Francia/ }).textContent).not.toMatch(/\d/);
  });

  /** De esto depende que el filtro viaje o no al servidor. */
  it('elegir «todos» devuelve NULO, no una cadena vacía', async () => {
    const { elegido, asienta } = await monta(POCAS, 'es');
    await userEvent.click(chip());
    await asienta();

    await userEvent.click(screen.getByRole('option', { name: /Todos|Todas/ }));
    await asienta();

    expect(elegido()).toBeNull();
  });

  it('elegir una opción devuelve su valor y cierra el panel', async () => {
    const { elegido, asienta } = await monta();
    await userEvent.click(chip());
    await asienta();

    await userEvent.click(screen.getByRole('option', { name: /Francia/ }));
    await asienta();

    expect(elegido()).toBe('fr');
    expect(screen.queryAllByRole('option')).toEqual([]);
  });

  describe('el buscador del panel', () => {
    /** Con cuatro opciones, un buscador estorba más de lo que ayuda. */
    it('no aparece con pocas opciones', async () => {
      const { asienta } = await monta(POCAS);

      await userEvent.click(chip());
      await asienta();

      expect(screen.queryByRole('textbox')).toBeNull();
    });

    it('aparece cuando hay muchas', async () => {
      const { asienta } = await monta(MUCHAS);

      await userEvent.click(chip());
      await asienta();

      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('filtra las opciones por lo tecleado', async () => {
      const { asienta } = await monta(MUCHAS);
      await userEvent.click(chip());
      await asienta();

      await userEvent.type(screen.getByRole('textbox'), 'Categoría 1');
      await asienta();

      /* «Categoría 1», «Categoría 10» y «Categoría 11», más la opción de «todas». */
      expect(screen.getAllByRole('option').length).toBeLessThan(MUCHAS.length);
    });

    it('sin coincidencias lo dice, en vez de dejar el panel vacío', async () => {
      const { asienta } = await monta(MUCHAS);
      await userEvent.click(chip());
      await asienta();

      await userEvent.type(screen.getByRole('textbox'), 'zzz');
      await asienta();

      expect(screen.getByText(/Sin resultados|Ningún|No hay/i)).toBeInTheDocument();
    });

    /** La consulta de la vez anterior escondía opciones sin explicar por qué. */
    it('se vacía al volver a abrir', async () => {
      const { asienta } = await monta(MUCHAS);
      await userEvent.click(chip());
      await asienta();
      await userEvent.type(screen.getByRole('textbox'), 'zzz');
      await asienta();

      await userEvent.click(chip());
      await asienta();
      await userEvent.click(chip());
      await asienta();

      expect(screen.getByRole('textbox')).toHaveValue('');
      expect(screen.getAllByRole('option').length).toBe(MUCHAS.length + 1);
    });
  });

  /** Sin teclado, un panel propio es un retroceso frente al desplegable nativo que sustituye. */
  it('las flechas recorren las opciones', async () => {
    const { asienta } = await monta();
    await userEvent.click(chip());
    await asienta();

    const opciones = screen.getAllByRole('option');
    opciones[0].focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(opciones[1]);

    await userEvent.keyboard('{End}');
    expect(document.activeElement).toBe(opciones[opciones.length - 1]);

    await userEvent.keyboard('{Home}');
    expect(document.activeElement).toBe(opciones[0]);

    /* Arriba desde la primera se queda donde está: no da la vuelta ni saca el foco del panel. */
    await userEvent.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(opciones[0]);
  });

  it('el chip enseña la opción elegida', async () => {
    const { vista } = await monta(POCAS, 'fr');

    expect((vista.fixture.nativeElement.textContent as string)).toContain('Francia');
  });
});
