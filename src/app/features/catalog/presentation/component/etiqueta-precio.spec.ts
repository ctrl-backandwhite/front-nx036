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
});
