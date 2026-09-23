import { render, screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';
import { TramoDePrecio } from '../../domain/model/producto';
import { TramosDePrecio } from './tramos-de-precio';

function tramo(min: number, max: number | undefined, formateado: string): TramoDePrecio {
  return {
    cantidadMinima: min,
    cantidadMaxima: max,
    precioUnitario: 0,
    divisa: 'EUR',
    precioUnitarioFormateado: formateado,
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
});
