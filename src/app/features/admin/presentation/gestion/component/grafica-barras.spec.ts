import { render, screen } from '@testing-library/angular';
import { GraficaBarras } from './grafica-barras';

/**
 * Las pruebas que MONTAN un componente tardan más de lo que Vitest espera por defecto (5 s) cuando hay
 * varios equipos compilando a la vez: el arranque de Angular compite por la máquina. El plazo se sube
 * aquí para que un fallo signifique lo que tiene que significar —que la lógica está mal— y no que el
 * ordenador iba cargado.
 */
vi.setConfig({ testTimeout: 30_000 });


describe('GraficaBarras', () => {
  const dias = ['2026-03-03', '2026-03-04', '2026-03-05'];

  it('dibuja una barra por día', async () => {
    const { container } = await render(GraficaBarras, {
      inputs: { dias, valores: [1, 5, 3], descripcion: 'Pedidos por día' },
    });

    expect(container.querySelectorAll('rect')).toHaveLength(3);
    expect(screen.getByRole('img', { name: 'Pedidos por día' })).toBeInTheDocument();
  });

  it('cada barra lleva el día y el valor, que es lo que se lee al pasar por encima', async () => {
    const { container } = await render(GraficaBarras, {
      inputs: { dias, valores: [1, 5, 3], formato: (v: number) => `${v} pedidos` },
    });

    const titulos = [...container.querySelectorAll('title')].map((t) => t.textContent);
    expect(titulos).toEqual(['2026-03-03: 1 pedidos', '2026-03-04: 5 pedidos', '2026-03-05: 3 pedidos']);
  });

  /**
   * Con todos los valores a cero, dividir por el máximo daría una altura no numérica y el navegador
   * pintaría un borrón. El máximo nunca baja de uno.
   */
  it('con la serie entera a cero pinta barras de altura cero, no un borrón', async () => {
    const { container } = await render(GraficaBarras, {
      inputs: { dias, valores: [0, 0, 0] },
    });

    for (const rect of container.querySelectorAll('rect')) {
      expect(Number(rect.getAttribute('height'))).toBe(0);
    }
  });

  it('sin valores no dibuja nada', async () => {
    const { container } = await render(GraficaBarras, { inputs: { dias: [], valores: [] } });

    expect(container.querySelectorAll('rect')).toHaveLength(0);
  });
});
