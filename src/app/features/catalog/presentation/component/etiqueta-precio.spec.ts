import { render, screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';
import { EtiquetaPrecio } from './etiqueta-precio';

describe('EtiquetaPrecio', () => {
  it('pinta el importe tal y como lo manda el backend', async () => {
    await render(EtiquetaPrecio, { inputs: { precio: { formateado: '14,06 €' } } });
    expect(screen.getByText('14,06 €')).toBeInTheDocument();
  });

  /** El rojo señala lo que se DEJA de pagar, no lo que se paga (decisión del usuario, 8-ago-2026). */
  it('con rebaja enseña el precio, el anterior tachado y el porcentaje', async () => {
    await render(EtiquetaPrecio, {
      inputs: {
        precio: { formateado: '14,06 €', anteriorFormateado: '20,00 €', descuentoPorcentaje: 30 },
      },
    });
    expect(screen.getByText('14,06 €')).toBeInTheDocument();
    expect(screen.getByText('20,00 €').tagName).toBe('S');
    expect(screen.getByText('−30%')).toBeInTheDocument();
  });

  /** Con solo una de las dos cosas el bloque queda a medias: un tachado sin ahorro, o un −0 %. */
  it('sin porcentaje no pinta el tachado', async () => {
    await render(EtiquetaPrecio, {
      inputs: { precio: { formateado: '14,06 €', anteriorFormateado: '20,00 €' } },
    });
    expect(screen.queryByText('20,00 €')).toBeNull();
  });

  it('sin importe no pinta nada', async () => {
    const { container } = await render(EtiquetaPrecio, { inputs: { precio: {} } });
    expect(container.textContent?.trim()).toBe('');
  });

  /**
   * El GROSOR del precio, que es lo que se vio mal en la tienda.
   *
   * <p>El precio sin rebaja se pintaba con el grosor normal en la portada, el catálogo y la ficha,
   * mientras el rebajado salía en negrita: dos precios distintos en la misma pantalla. La causa eran dos
   * asociaciones `[class]` en el mismo elemento, de las que la segunda pisaba a la primera —y la primera
   * era justo la que trae el tamaño y el grosor—.
   *
   * <p>Se comprueba el grosor Y la clase que viene de fuera, porque el arreglo consiste precisamente en
   * que las dos convivan: quedarse con una sola habría «arreglado» esto rompiendo lo otro.
   */
  describe('el grosor del importe', () => {
    it('un precio sin rebaja va en negrita', async () => {
      const vista = await render(EtiquetaPrecio, {
        inputs: { precio: { formateado: '14,95 €' }, tamano: 'sm' },
      });

      const importe = vista.container.querySelector('span.text-base-content')!;
      expect(importe.className).toContain('font-bold');
    });

    it('y conserva la clase que le pasa quien lo monta', async () => {
      const vista = await render(EtiquetaPrecio, {
        inputs: { precio: { formateado: '14,95 €' }, tamano: 'sm', clase: 'mt-2' },
      });

      const importe = vista.container.querySelector('span.text-base-content')!;
      expect(importe.className).toContain('font-bold');
      expect(importe.className).toContain('mt-2');
    });

    /** El grande de la ficha es el que más se mira: 3xl y en negrita, como en el front anterior. */
    it('el de la ficha es grande y en negrita', async () => {
      const vista = await render(EtiquetaPrecio, {
        inputs: { precio: { formateado: '30,11 €' }, tamano: 'lg' },
      });

      const importe = vista.container.querySelector('span.text-base-content')!;
      expect(importe.className).toContain('text-3xl');
      expect(importe.className).toContain('font-bold');
    });
  });
});
