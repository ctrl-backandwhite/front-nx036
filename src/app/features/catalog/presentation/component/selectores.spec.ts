import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EjeDeVariante } from '../../domain/model/producto';
import { SelectorColor } from './selector-color';
import { TablaTallas } from './tabla-tallas';
import { SelectorCantidad } from './selector-cantidad';

function eje(nombre: string, valores: { valor: string; imagen?: string }[]): EjeDeVariante {
  return {
    id: nombre,
    nombreZh: nombre,
    nombre,
    posicion: 0,
    valores: valores.map((v, i) => ({
      id: `${nombre}-${i}`,
      valorZh: v.valor,
      valor: v.valor,
      imagen: v.imagen,
      posicion: i,
    })),
  };
}

describe('SelectorColor', () => {
  const colores = eje('Color', [{ valor: 'Rojo', imagen: 'rojo.jpg' }, { valor: 'Azul' }]);

  it('pinta un recuadro por color', async () => {
    await render(SelectorColor, { inputs: { eje: colores, elegido: 'Rojo' } });
    expect(screen.getByTitle('Rojo')).toBeInTheDocument();
    expect(screen.getByTitle('Azul')).toBeInTheDocument();
  });

  /**
   * El primer color queda elegido al abrir para que el stock y el precio sean los de una variante real,
   * pero SIN cambiar la foto: al entrar se enseña la imagen principal del producto.
   */
  it('elige el primero por defecto y sin cambiar la foto', async () => {
    const elige = vi.fn();
    await render(SelectorColor, { inputs: { eje: colores, elegido: null }, on: { elige } });
    expect(elige).toHaveBeenCalledWith({ etiqueta: 'Rojo', foto: undefined });
  });

  it('al pulsar un color avisa con su foto', async () => {
    const elige = vi.fn();
    const vista = await render(SelectorColor, {
      inputs: { eje: colores, elegido: 'Azul' },
      on: { elige },
    });
    await userEvent.click(screen.getByTitle('Rojo'));
    vista.fixture.detectChanges();
    expect(elige).toHaveBeenCalledWith({ etiqueta: 'Rojo', foto: 'rojo.jpg' });
  });

  it('el aspa de borrar solo aparece para el administrador', async () => {
    const borra = vi.fn();
    const vista = await render(SelectorColor, {
      inputs: { eje: colores, elegido: 'Rojo', puedeEditar: true },
      on: { borra },
    });
    const papeleras = vista.container.querySelectorAll<HTMLElement>('.bg-error');
    await userEvent.click(papeleras[0]);
    vista.fixture.detectChanges();
    expect(borra).toHaveBeenCalledWith('Color-0');
  });

  it('sin valores no pinta nada', async () => {
    const { container } = await render(SelectorColor, {
      inputs: { eje: eje('Color', []), elegido: null },
    });
    expect(container.textContent?.trim()).toBe('');
  });
});

describe('TablaTallas', () => {
  const tallas = eje('Talla', [{ valor: 'S' }, { valor: 'M' }]);

  async function monta(existencias: (talla: string) => number, unidades = {}) {
    const cambia = vi.fn();
    const vista = await render(TablaTallas, {
      inputs: { eje: tallas, unidades, existencias },
      on: { cambia },
    });
    return { vista, cambia };
  }

  it('enseña las existencias de cada talla', async () => {
    await monta((talla) => (talla === 'S' ? 4 : 0));
    expect(screen.getByText('S')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('una talla agotada no se puede pedir', async () => {
    await monta((talla) => (talla === 'S' ? 4 : 0));
    const campos = screen.getAllByRole('spinbutton');
    expect(campos[1]).toBeDisabled();
  });

  it('el botón de sumar avisa con la cantidad pedida', async () => {
    const { vista, cambia } = await monta(() => 3);
    const botones = vista.container.querySelectorAll<HTMLElement>('.join button');
    // El segundo botón de la primera talla es el de sumar.
    await userEvent.click(botones[1]);
    vista.fixture.detectChanges();
    expect(cambia).toHaveBeenCalledWith({ talla: 'S', cantidad: 1 });
  });

  /** Tecleando tampoco se puede pedir más de lo que hay. */
  it('lo tecleado se recorta al stock', async () => {
    const { vista, cambia } = await monta(() => 3);
    const campo = vista.container.querySelector<HTMLInputElement>('input[type=number]')!;
    campo.value = '9';
    campo.dispatchEvent(new Event('change'));
    vista.fixture.detectChanges();
    expect(cambia).toHaveBeenCalledWith({ talla: 'S', cantidad: 3 });
  });

  it('sin tallas no pinta la tarjeta', async () => {
    const { container } = await render(TablaTallas, {
      inputs: { eje: eje('Talla', []), unidades: {}, existencias: () => 0 },
    });
    expect(container.textContent?.trim()).toBe('');
  });
});

describe('SelectorCantidad', () => {
  it('no deja bajar del pedido mínimo', async () => {
    await render(SelectorCantidad, { inputs: { cantidad: 5, minimo: 5 } });
    expect(screen.getAllByRole('button')[0]).toBeDisabled();
  });

  it('sube y baja la cantidad', async () => {
    const vista = await render(SelectorCantidad, { inputs: { cantidad: 2, minimo: 1 } });
    await userEvent.click(screen.getAllByRole('button')[1]);
    vista.fixture.detectChanges();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  /** Sin ellas, quien compra no sabe si el color que ha marcado queda o no. */
  it('enseña las existencias de la variante elegida', async () => {
    const { container } = await render(SelectorCantidad, {
      inputs: { cantidad: 1, minimo: 1, existencias: 0 },
    });
    expect(container.querySelector('.text-error')).not.toBeNull();
  });
});
