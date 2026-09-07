import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { BorradorDeRegla, ReglaDePrecio } from '../../../domain/gestion/model/precios';
import { AmbitosDisponibles } from '../../../application/gestion/use-case/precios.use-case';
import { PreciosEditorDeRegla } from './precios-editor-de-regla';

/**
 * El editor de una regla de MARGEN: de estos campos sale el precio al que se vende cada producto.
 *
 * <p>Las reglas de este formulario no son de forma, son de alcance. Cada una impide una regla que se
 * guardaría sin queja y no haría lo que quien la escribió creía:
 *
 * <ul>
 *   <li>un margen NEGATIVO vende por debajo del coste;
 *   <li>un tramo de coste AL REVÉS —máximo por debajo del mínimo— no casa con ningún producto: la regla
 *       queda muerta y el margen que sustituía deja de aplicarse;
 *   <li>una regla de categoría SIN categoría no se aplica a nada;
 *   <li>y peor: un identificador que era del ámbito ANTERIOR. Al cambiar de ámbito queda huérfano, y
 *       guardarlo aplicaría el margen a otra cosa distinta de la que se ve en pantalla.
 * </ul>
 *
 * <p>Y lo vacío vuelve a salir como «sin valor», no como cadena vacía ni cero: «cualquier país» y «sin
 * límite de coste» son alcances distintos de «el país “”» y «coste 0».
 */
const AMBITOS: AmbitosDisponibles = {
  categorias: [{ id: 'c1', nombre: 'Moda' }],
  proveedores: [{ id: 's1', nombre: 'Yiwu' }],
  productos: [{ id: 'p1', nombre: 'Gorro' }],
  grupos: [{ id: 'g1', nombre: 'Textil ligero' }],
};

const BASE: BorradorDeRegla = { ambito: 'GLOBAL', tipo: 'PERCENTAGE', valor: 150, activa: true };

async function monta(inicial: BorradorDeRegla = BASE, reglas: readonly ReglaDePrecio[] = []) {
  const guardadas: BorradorDeRegla[] = [];
  const cancelado = vi.fn();

  const vista = await render(PreciosEditorDeRegla, {
    inputs: { inicial, ambitos: AMBITOS, reglas },
    on: { guarda: (r: BorradorDeRegla) => guardadas.push(r), cancela: cancelado },
  });
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();

  const asienta = async () => {
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
  };

  return { vista, asienta, guardadas, cancelado };
}

const campo = (id: string) =>
  document.querySelector<HTMLInputElement | HTMLSelectElement>(`#regla-${id}`)!;
const guardar = () => screen.getByRole('button', { name: /Guardar/ });

async function escribe(id: string, valor: string, asienta: () => Promise<void>) {
  const control = campo(id);
  control.value = valor;
  control.dispatchEvent(new Event('input', { bubbles: true }));
  control.dispatchEvent(new Event('change', { bubbles: true }));
  await asienta();
}

describe('PreciosEditorDeRegla', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('llega con los valores de la regla que se edita', async () => {
    await monta();

    expect(campo('valor')).toHaveValue(150);
    expect(campo('ambito')).toHaveValue('GLOBAL');
  });

  describe('lo que no se puede guardar', () => {
    it('un margen negativo, que vendería por debajo del coste', async () => {
      const { asienta } = await monta();

      await escribe('valor', '-10', asienta);

      expect(guardar()).toBeDisabled();
    });

    it('un tramo de coste AL REVÉS, que no casa con ningún producto', async () => {
      const { asienta } = await monta();

      await escribe('coste-min', '50', asienta);
      await escribe('coste-max', '10', asienta);

      expect(guardar()).toBeDisabled();
    });

    it('un país que no tiene forma de código ISO', async () => {
      const { asienta } = await monta();

      await escribe('pais', 'ESP', asienta);

      expect(guardar()).toBeDisabled();
    });

    it('una regla de categoría SIN categoría elegida', async () => {
      const { asienta } = await monta({ ...BASE, ambito: 'CATEGORY' });
      await asienta();

      expect(guardar()).toBeDisabled();
    });

    /**
     * El caso peligroso: el identificador se quedó del ámbito anterior. La pantalla enseña «proveedor»
     * y el identificador es de una categoría; guardado, el margen se aplicaría a otra cosa.
     */
    it('un identificador que NO pertenece al ámbito elegido', async () => {
      const { asienta } = await monta({ ...BASE, ambito: 'SUPPLIER', idAmbito: 'c1' });
      await asienta();

      expect(guardar()).toBeDisabled();
    });
  });

  it('con la categoría elegida sí se guarda, y viaja su identificador', async () => {
    const { guardadas, asienta } = await monta({ ...BASE, ambito: 'CATEGORY', idAmbito: 'c1' });
    await asienta();

    await userEvent.click(guardar());

    expect(guardadas[0]).toMatchObject({ ambito: 'CATEGORY', idAmbito: 'c1' });
  });

  /** La variante se teclea a mano: no hay lista de la que elegirla. */
  it('el ámbito de variante admite un identificador tecleado', async () => {
    const { guardadas, asienta } = await monta({ ...BASE, ambito: 'VARIANT' });
    await asienta();

    await escribe('entidad', 'v-123', asienta);
    await userEvent.click(guardar());

    expect(guardadas[0].idAmbito).toBe('v-123');
  });

  describe('lo vacío sale como «sin valor», no como cero ni cadena vacía', () => {
    it('sin país, la regla vale para cualquiera', async () => {
      const { guardadas } = await monta();

      await userEvent.click(guardar());

      /* Una cadena vacía como país haría que el backend buscara el país «», que no existe: la regla
       * dejaría de aplicarse a todo el mundo sin dar ningún error. */
      expect(guardadas[0].pais).toBeUndefined();
    });

    it('sin tramo de coste, la regla vale para cualquier coste', async () => {
      const { guardadas } = await monta();

      await userEvent.click(guardar());

      expect(guardadas[0].costeMinimoUsd).toBeUndefined();
      expect(guardadas[0].costeMaximoUsd).toBeUndefined();
    });

    it('sin ámbito concreto, el identificador no viaja', async () => {
      const { guardadas } = await monta({ ...BASE, ambito: 'GLOBAL', idAmbito: 'c1' });

      await userEvent.click(guardar());

      expect(guardadas[0].idAmbito).toBeUndefined();
    });
  });

  it('el país se guarda en mayúsculas', async () => {
    const { guardadas, asienta } = await monta();

    await escribe('pais', 'es', asienta);
    await userEvent.click(guardar());

    expect(guardadas[0].pais).toBe('ES');
  });

  /** El aviso mira el borrador VIVO: el solape se ve mientras se teclea, no al guardar. */
  it('avisa del solape con otra regla mientras se edita', async () => {
    const existente: ReglaDePrecio = {
      id: 'r9',
      ambito: 'GLOBAL',
      tipo: 'PERCENTAGE',
      valor: 120,
      activa: true,
      posicion: 1,
    };

    const { vista } = await monta(BASE, [existente]);
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();

    /* El aviso sale del borrador VIVO: aparece mientras se teclea, no al guardar. Si solo se
     * comprobara al enviar, quien escribe una regla ambigua se enteraría después de haberla creado. */
    expect(screen.getByRole('alert').textContent).toContain('La resolución elige el rango más estrecho');
  });

  it('cancelar no guarda nada', async () => {
    const { guardadas, cancelado } = await monta();

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(cancelado).toHaveBeenCalled();
    expect(guardadas).toEqual([]);
  });
});
