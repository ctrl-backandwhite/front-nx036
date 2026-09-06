import { faBoxesStacked } from '@fortawesome/free-solid-svg-icons';
import { render, screen } from '@testing-library/angular';
import { BloqueKpi } from './bloque-kpi';

/**
 * Las pruebas que MONTAN un componente tardan más de lo que Vitest espera por defecto (5 s) cuando hay
 * varios equipos compilando a la vez: el arranque de Angular compite por la máquina. El plazo se sube
 * aquí para que un fallo signifique lo que tiene que significar —que la lógica está mal— y no que el
 * ordenador iba cargado.
 */
vi.setConfig({ testTimeout: 30_000 });


describe('BloqueKpi', () => {
  it('enseña el rótulo y la cifra', async () => {
    await render(BloqueKpi, {
      inputs: { icono: faBoxesStacked, etiqueta: 'Productos', valor: 1240 },
    });

    expect(screen.getByText('Productos')).toBeInTheDocument();
    // El contador anima hasta la cifra; con movimiento reducido —lo normal en pruebas— salta al final.
    expect(await screen.findByText(/1.?240/)).toBeInTheDocument();
  });

  /** Un cero es un DATO: verlo mientras carga hace pensar que el catálogo está vacío. */
  it('mientras carga no enseña un cero, sino un indicador de espera', async () => {
    const { container } = await render(BloqueKpi, {
      inputs: { icono: faBoxesStacked, etiqueta: 'Productos', cargando: true },
    });

    expect(screen.queryByText('0')).toBeNull();
    expect(container.querySelector('.loading')).toBeTruthy();
  });

  it('la tendencia solo aparece cuando hay algo que contar', async () => {
    const { rerender } = await render(BloqueKpi, {
      inputs: { icono: faBoxesStacked, etiqueta: 'Activos', valor: 10 },
    });
    expect(screen.queryByText('80%')).toBeNull();

    await rerender({
      inputs: { icono: faBoxesStacked, etiqueta: 'Activos', valor: 10, tendencia: '80%', alAlza: true },
    });

    expect(screen.getByText('80%')).toBeInTheDocument();
  });
});
