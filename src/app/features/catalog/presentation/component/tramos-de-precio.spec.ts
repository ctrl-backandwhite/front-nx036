import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TramoDePrecio } from '../../domain/model/producto';
import { TramosDePrecio } from './tramos-de-precio';

function tramo(
  min: number,
  max: number | undefined,
  formateado: string,
  recargoPct?: number,
): TramoDePrecio {
  return {
    cantidadMinima: min,
    cantidadMaxima: max,
    precioUnitario: 0,
    divisa: 'EUR',
    precioUnitarioFormateado: formateado,
    recargoPct,
  };
}

const TRES = [tramo(1, 49, '9,90 €'), tramo(50, 199, '8,50 €'), tramo(200, undefined, '7,20 €')];

/**
 * Los precios por cantidad de la ficha.
 *
 * <p>Quien compra aquí es un revendedor: saber que a partir de cincuenta unidades el precio baja es
 * lo que decide el tamaño del pedido. La tabla se retiró en su día porque enseñaba cuatro cifras sin
 * decir cuál tocaba; lo que la hace válida ahora es que marca la que se está pagando.
 */
describe('TramosDePrecio', () => {
  it('pinta un escalón por tramo, con su rango y su precio', async () => {
    await render(TramosDePrecio, { inputs: { tramos: TRES, unidades: 1 } });

    expect(screen.getByText('9,90 €')).toBeInTheDocument();
    expect(screen.getByText('8,50 €')).toBeInTheDocument();
    expect(screen.getByText('7,20 €')).toBeInTheDocument();
  });

  it('el rango abierto se escribe con un más, no con un máximo inventado', async () => {
    await render(TramosDePrecio, { inputs: { tramos: TRES, unidades: 1 } });

    expect(screen.getByText(/^200\+/)).toBeInTheDocument();
    expect(screen.getByText(/^1 – 49/)).toBeInTheDocument();
  });

  /*
   * Lo que resuelve la objeción por la que se retiró la tabla: no hay que adivinar cuál toca. Se
   * marca el escalón que la cantidad de ahora está pagando.
   */
  it('resalta el escalón que se está pagando y solo ese', async () => {
    const { container } = await render(TramosDePrecio, { inputs: { tramos: TRES, unidades: 75 } });

    const activos = container.querySelectorAll('.border-primary');
    expect(activos.length).toBe(1);
    expect(activos[0].textContent).toContain('8,50 €');
  });

  it('con una sola cantidad no pinta nada: una fila no informa de ningún salto', async () => {
    const { container } = await render(TramosDePrecio, {
      inputs: { tramos: [tramo(1, undefined, '9,90 €')], unidades: 1 },
    });

    expect(container.textContent?.trim()).toBe('');
  });

  /** El importe lo compone el backend: aquí solo se pinta, o saldría un número que no se cobra. */
  it('sin importe del backend pinta un guión, no un cero', async () => {
    const sinFormato: TramoDePrecio = {
      cantidadMinima: 1,
      cantidadMaxima: 9,
      precioUnitario: 9.9,
      divisa: 'EUR',
    };
    await render(TramosDePrecio, {
      inputs: { tramos: [sinFormato, tramo(10, undefined, '8,00 €')], unidades: 1 },
    });

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  /* ============ El recargo de cada escalón (24-sep-2026) ============ */

  /**
   * El recargo se decide MIRANDO la tabla, así que se edita aquí.
   *
   * <p>Estaba solo en la pestaña «Precios» del panel, que es otra pantalla: el titular lo buscó en la
   * ficha, no lo encontró, y tenía razón —comparar lo que cobra cada escalón es justo lo que hace
   * falta para poner el recargo—.
   */
  it('quien administra ve un lápiz por escalón', async () => {
    const { container } = await render(TramosDePrecio, {
      inputs: { tramos: TRES, unidades: 1, puedeEditar: true },
    });

    expect(container.querySelectorAll('button').length).toBe(3);
  });

  /** Y quien compra no ve ninguno: el recargo es un importe interno, como el resto del desglose. */
  it('quien compra no ve ningún lápiz', async () => {
    const { container } = await render(TramosDePrecio, { inputs: { tramos: TRES, unidades: 1 } });

    expect(container.querySelectorAll('button').length).toBe(0);
  });

  /**
   * Vacío NO es cero: la casilla en blanco dice que el tramo hereda el recargo del producto, y un cero
   * escrito es un recargo de cero. Pintar «0» donde nadie lo ha puesto haría creer que ese escalón no
   * lleva cargo cuando sí lleva el del producto.
   */
  it('sin recargo propio dice que hereda, no pinta un cero', async () => {
    const { container } = await render(TramosDePrecio, {
      inputs: { tramos: TRES, unidades: 1, puedeEditar: true },
    });

    // Se mira el RÓTULO del recargo, no todo el texto: los propios precios llevan ceros («9,90 €»).
    const rotulos = [...container.querySelectorAll('.border-t.pt-1')].map((e) => e.textContent ?? '');
    expect(rotulos.length).toBe(3);
    for (const rotulo of rotulos) {
      expect(rotulo).not.toMatch(/\d/);
    }
  });

  it('con recargo propio enseña su importe', async () => {
    const conRecargo = [tramo(1, 49, '9,90 €'), tramo(50, undefined, '8,50 €', 3)];
    const { container } = await render(TramosDePrecio, {
      inputs: { tramos: conRecargo, unidades: 1, puedeEditar: true },
    });

    expect(container.textContent).toContain('3');
  });

  /** Al guardar sale la CANTIDAD MÍNIMA, que es lo que identifica al tramo, y el importe tecleado. */
  it('al escribir un recargo y pulsar Intro avisa con el tramo y el importe', async () => {
    const cambiaRecargo = vi.fn();
    const { container, fixture } = await render(TramosDePrecio, {
      inputs: { tramos: TRES, unidades: 1, puedeEditar: true },
      on: { cambiaRecargo },
    });

    const lapices = container.querySelectorAll<HTMLElement>('button');
    lapices[1].click();
    fixture.detectChanges();
    await fixture.whenStable();

    const campo = container.querySelector<HTMLInputElement>('input[type=number]')!;
    await userEvent.clear(campo);
    await userEvent.type(campo, '2.5{enter}');

    expect(cambiaRecargo).toHaveBeenCalledWith({ cantidadMinima: 50, recargoPct: 2.5 });
  });

  /** Vaciar la casilla es una decisión: devuelve el tramo a heredar el recargo del producto. */
  it('vaciar la casilla manda nulo, no cero', async () => {
    const cambiaRecargo = vi.fn();
    const conRecargo = [tramo(1, 49, '9,90 €'), tramo(50, undefined, '8,50 €', 3)];
    const { container, fixture } = await render(TramosDePrecio, {
      inputs: { tramos: conRecargo, unidades: 1, puedeEditar: true },
      on: { cambiaRecargo },
    });

    container.querySelectorAll<HTMLElement>('button')[1].click();
    fixture.detectChanges();
    await fixture.whenStable();

    const campo = container.querySelector<HTMLInputElement>('input[type=number]')!;
    await userEvent.clear(campo);
    await userEvent.type(campo, '{enter}');

    expect(cambiaRecargo).toHaveBeenCalledWith({ cantidadMinima: 50, recargoPct: null });
  });

  /** Pasar por la casilla sin tocarla no guarda: cada guardado recalcula el precio y recarga la ficha. */
  it('no avisa si el recargo no ha cambiado', async () => {
    const cambiaRecargo = vi.fn();
    const conRecargo = [tramo(1, 49, '9,90 €'), tramo(50, undefined, '8,50 €', 3)];
    const { container, fixture } = await render(TramosDePrecio, {
      inputs: { tramos: conRecargo, unidades: 1, puedeEditar: true },
      on: { cambiaRecargo },
    });

    container.querySelectorAll<HTMLElement>('button')[1].click();
    fixture.detectChanges();
    await fixture.whenStable();

    const campo = container.querySelector<HTMLInputElement>('input[type=number]')!;
    await userEvent.type(campo, '{enter}');

    expect(cambiaRecargo).not.toHaveBeenCalled();
  });
});
