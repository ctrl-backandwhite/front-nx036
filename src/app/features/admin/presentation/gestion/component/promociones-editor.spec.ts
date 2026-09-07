import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { BorradorDePromocion } from '../../../domain/gestion/model/promociones';
import { PromocionesEditor } from './promociones-editor';

/**
 * El editor de una promoción.
 *
 * <p>Las reglas de este formulario son todas de negocio, y las tres primeras se guardaban antes SIN UNA
 * SOLA QUEJA:
 *
 * <ul>
 *   <li>una promoción que TERMINA ANTES DE EMPEZAR no descuenta nunca — es la validación cruzada;
 *   <li>un tope de CERO usos apaga el cupón el mismo día que se crea; vacío, en cambio, es «sin tope»;
 *   <li>un descuento fuera del 1–99 % o no descuenta nada o regala el producto.
 * </ul>
 *
 * <p>Y al cambiar de alcance se OLVIDAN las listas del anterior: una promoción marcada «todo el
 * catálogo» que arrastrara las categorías de cuando era «por categoría» seguiría aplicándolas a
 * escondidas.
 */
const BASE: BorradorDePromocion = {
  nombre: 'Rebajas',
  codigo: 'reb10',
  clase: 'DISCOUNT',
  ambito: 'ALL',
  porcentaje: 10,
  activa: true,
};

async function monta(inicial: BorradorDePromocion = BASE) {
  const guardadas: BorradorDePromocion[] = [];
  const cancelado = vi.fn();

  const vista = await render(PromocionesEditor, {
    inputs: { inicial, categorias: [{ id: 'c1', nombre: 'Moda' }] },
    on: { guarda: (p: BorradorDePromocion) => guardadas.push(p), cancela: cancelado },
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
  document.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    `#promo-${id}`,
  )!;
const guardar = () => screen.getByRole('button', { name: 'Guardar' });

/** Escribe un valor en un campo que el teclado simulado no admite bien (fechas, números con signo). */
async function escribe(id: string, valor: string, asienta: () => Promise<void>) {
  const control = campo(id);
  control.value = valor;
  /* Se lanzan los DOS sucesos: los campos de fecha del DOM simulado publican el valor por «change» y
   * los de texto por «input», y aquí se usan ambos tipos. */
  control.dispatchEvent(new Event('input', { bubbles: true }));
  control.dispatchEvent(new Event('change', { bubbles: true }));
  await asienta();
}

describe('PromocionesEditor', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('llega con los valores de la promoción que se edita', async () => {
    await monta();

    expect(campo('nombre')).toHaveValue('Rebajas');
    expect(campo('descuento')).toHaveValue(10);
  });

  /** El código se teclea en el pago, y allí no se distingue mayúscula de minúscula. */
  it('el código se guarda en MAYÚSCULAS', async () => {
    const { guardadas } = await monta();

    await userEvent.click(guardar());

    expect(guardadas[0].codigo).toBe('REB10');
  });

  describe('lo que no se puede guardar', () => {
    it('sin nombre', async () => {
      const { asienta } = await monta();

      await userEvent.clear(campo('nombre'));
      await asienta();

      expect(guardar()).toBeDisabled();
    });

    it('con un descuento del 0 %, que no descuenta nada', async () => {
      const { asienta } = await monta();

      await escribe('descuento', '0', asienta);

      expect(guardar()).toBeDisabled();
    });

    it('ni del 100 %, que regala el producto', async () => {
      const { asienta } = await monta();

      await escribe('descuento', '100', asienta);

      expect(guardar()).toBeDisabled();
    });

    /** Un tope de cero usos apaga el cupón el mismo día que se crea. */
    it('con un tope de CERO usos', async () => {
      const { asienta } = await monta();

      await escribe('usos', '0', asienta);

      expect(guardar()).toBeDisabled();
    });

    /**
     * La validación CRUZADA. Una promoción que termina antes de empezar no descuenta nunca, y hasta que
     * existió esta regla se guardaba sin una sola queja: el fallo aparecía como «el cupón no funciona».
     */
    it('cuando termina ANTES de empezar', async () => {
      const { asienta } = await monta();

      /* Los campos son `datetime-local`: con una fecha suelta el navegador descarta el valor y no
       * cambia nada, así que hay que escribir también la hora. */
      await escribe('empieza', '2026-09-10T09:00', asienta);
      await escribe('termina', '2026-09-01T09:00', asienta);

      expect(guardar()).toBeDisabled();
    });

    it('pero el mismo día sí vale: una promoción de una jornada', async () => {
      const { asienta } = await monta();

      await escribe('empieza', '2026-09-10T09:00', asienta);
      await escribe('termina', '2026-09-10T09:00', asienta);

      expect(guardar()).not.toBeDisabled();
    });
  });

  /** Vacío es «sin tope», que es lo normal en la mayoría de promociones. */
  it('sin tope de usos sí se puede guardar', async () => {
    const { guardadas } = await monta();

    await userEvent.click(guardar());

    expect(guardadas[0].usosMaximos).toBeUndefined();
  });

  describe('el alcance', () => {
    it('con alcance de CATEGORÍA se guardan las categorías marcadas', async () => {
      const { guardadas, asienta } = await monta({
        ...BASE,
        ambito: 'CATEGORY',
        categorias: ['c1'],
      });
      await asienta();

      await userEvent.click(guardar());

      expect(guardadas[0].categorias).toEqual(['c1']);
    });

    /** Si no se olvidaran, seguirían aplicándose a escondidas bajo un alcance que dice otra cosa. */
    it('al volver a «todo el catálogo» se olvidan las categorías del alcance anterior', async () => {
      const { guardadas, asienta } = await monta({
        ...BASE,
        ambito: 'CATEGORY',
        categorias: ['c1'],
      });

      await userEvent.selectOptions(campo('ambito'), 'ALL');
      await asienta();
      await userEvent.click(guardar());

      expect(guardadas[0].categorias).toEqual([]);
    });

    it('con alcance de PRODUCTO, los identificadores se pegan uno por línea', async () => {
      const { guardadas, asienta } = await monta({ ...BASE, ambito: 'PRODUCT' });
      await asienta();

      await escribe('productos', ' p1 \n\n p2 \n', asienta);
      await userEvent.click(guardar());

      /* Se recortan los espacios y se descartan las líneas en blanco: pegar una lista de otra
       * herramienta arrastra las dos cosas, y un identificador con espacios no casa con nada. */
      expect(guardadas[0].productos).toEqual(['p1', 'p2']);
    });
  });

  /**
   * Las promociones de importe fijo se administran por otra vía y aquí ni siquiera se enseña su campo
   * de porcentaje. Exigirlo dejaría sin poder editar su nombre o su vigencia.
   */
  it('una promoción de importe fijo no exige porcentaje', async () => {
    const { asienta } = await monta({
      ...BASE,
      porcentaje: undefined,
      importeCentimos: 500,
    });
    await asienta();

    expect(guardar()).not.toBeDisabled();
  });

  it('cancelar no guarda nada', async () => {
    const { guardadas, cancelado } = await monta();

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(cancelado).toHaveBeenCalled();
    expect(guardadas).toEqual([]);
  });
});
