import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { ALMACEN_LOCAL } from '@core/storage/almacen.port';
import { ANALITICA_DE_PRODUCTO_PORT } from '../../domain/port/analitica-de-producto.port';
import { GUIA_DE_BIENVENIDA_PORT } from '../../domain/port/guia-de-bienvenida.port';
import { HistoricoDePrecios } from './historico-de-precios';
import { EstimacionDeMargen } from './estimacion-de-margen';
import { GuiaDeBienvenida } from './guia-de-bienvenida';

const ALMACEN_DE_MENTIRA = {
  provide: ALMACEN_LOCAL,
  useValue: { lee: () => null, guarda: () => undefined, borra: () => undefined },
};

describe('HistoricoDePrecios', () => {
  async function monta(historico: () => Promise<unknown>) {
    const vista = await render(HistoricoDePrecios, {
      inputs: { idDelProducto: 'p1' },
      providers: [
        {
          provide: ANALITICA_DE_PRODUCTO_PORT,
          useValue: { historicoDePrecios: historico, estimacionDeMargen: vi.fn() },
        },
      ],
    });
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    return vista;
  }

  it('dibuja la línea de precio y la de existencias', async () => {
    const vista = await monta(async () =>
      exito([
        { fecha: '2026-06-01', precio: 10, existencias: 100 },
        { fecha: '2026-09-01', precio: 12, existencias: 60 },
      ]),
    );
    expect(vista.container.querySelectorAll('path')).toHaveLength(2);
    expect(vista.container.textContent).toContain('+20.0%');
  });

  /** Sin histórico no hay nada que dibujar: una gráfica vacía confunde más que no ponerla. */
  it('sin datos no se pinta', async () => {
    const vista = await monta(async () => exito([]));
    expect(vista.container.querySelector('svg')).toBeNull();
  });

  it('un fallo tampoco deja media gráfica', async () => {
    const vista = await monta(async () => fallo(creaError('sin-conexion')));
    expect(vista.container.querySelector('svg')).toBeNull();
  });

  /** Con todos los precios iguales el rango es cero: la línea va por el centro, no divide por cero. */
  it('aguanta un histórico plano', async () => {
    const vista = await monta(async () =>
      exito([
        { fecha: '2026-06-01', precio: 10, existencias: 5 },
        { fecha: '2026-09-01', precio: 10, existencias: 5 },
      ]),
    );
    expect(vista.container.querySelector('svg')).not.toBeNull();
    expect(vista.container.textContent).toContain('+0.0%');
  });
});

describe('EstimacionDeMargen', () => {
  async function monta(margen: number) {
    const estimacionDeMargen = vi.fn().mockResolvedValue(
      exito({
        coste: 3,
        precioSugerido: 10,
        envio: 1,
        comision: 0.5,
        beneficio: 5.5,
        margenPorcentaje: margen,
        divisa: 'EUR',
        reglaAplicadaPorcentaje: 150,
        tramoAplicadoDesde: 10,
      }),
    );
    const vista = await render(EstimacionDeMargen, {
      inputs: { idDelProducto: 'p1' },
      providers: [
        {
          provide: ANALITICA_DE_PRODUCTO_PORT,
          useValue: { estimacionDeMargen, historicoDePrecios: vi.fn() },
        },
      ],
    });
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    return { vista, estimacionDeMargen };
  }

  it('enseña el desglose y de dónde sale el cálculo', async () => {
    const { vista } = await monta(55);
    expect(vista.container.textContent).toContain('55.0%');
    expect(vista.container.textContent).toContain('+150%');
  });

  /** Se vendió a pérdida por no mirarlo: el aviso es el que de verdad importa. */
  it('avisa cuando el margen es negativo', async () => {
    const { vista } = await monta(-8);
    expect(vista.container.querySelector('[role=alert]')).not.toBeNull();
    expect(vista.container.querySelector('.text-red-700')).not.toBeNull();
  });

  it('avisa también cuando es demasiado bajo', async () => {
    const { vista } = await monta(2);
    expect(vista.container.querySelector('[role=alert]')).not.toBeNull();
  });

  it('cambiar el destino vuelve a pedir el cálculo', async () => {
    const { vista, estimacionDeMargen } = await monta(30);
    await userEvent.selectOptions(vista.container.querySelector('select')!, 'DE');
    await vista.fixture.whenStable();
    expect(estimacionDeMargen).toHaveBeenLastCalledWith('p1', 'DE', 1);
  });
});

describe('GuiaDeBienvenida', () => {
  const EJEMPLOS = {
    ejemplos: [
      {
        id: 'e1',
        slug: 'e1',
        titulo: 'Gorro',
        imagen: null,
        precioFormateado: '9,90 €',
        pesoGramos: 200,
      },
    ],
    derechoPorPartidaFormateado: '3,00 €',
    topeDePedidoFormateado: '150,00 €',
  };

  async function monta(ejemplos = async () => exito(EJEMPLOS), simula = vi.fn()) {
    const vista = await render(GuiaDeBienvenida, {
      inputs: { abrir: true },
      providers: [
        ALMACEN_DE_MENTIRA,
        { provide: GUIA_DE_BIENVENIDA_PORT, useValue: { ejemplos, simula } },
      ],
    });
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    return vista;
  }

  it('se abre cuando quien la presenta lo pide', async () => {
    const vista = await monta();
    expect(vista.container.querySelector('[role=dialog]')).not.toBeNull();
  });

  it('avanza y retrocede por los pasos', async () => {
    const vista = await monta();
    const puntos = () => vista.container.querySelectorAll('.bg-brand-500').length;
    const antes = puntos();
    await userEvent.click(screen.getByText(/welcome.next|Next|Siguiente/i));
    vista.fixture.detectChanges();
    expect(puntos()).toBeGreaterThan(antes);
  });

  /**
   * Contarle el arancel por partida a quien compra desde fuera de la Unión sería explicarle una regla
   * que no le aplica y dejarle esperando un cobro que no existe. Se reconoce por el mismo dato que
   * decide todo lo demás del arancel, para no mantener una segunda lista de países.
   */
  it('sin derecho por artículo, el paso del arancel no existe', async () => {
    const vista = await monta(async () => exito({ ...EJEMPLOS, derechoPorPartidaFormateado: '' }));
    // Un punto por paso: sin arancel son cuatro en vez de cinco.
    expect(vista.container.querySelectorAll('[aria-hidden="true"] > span')).toHaveLength(4);
  });

  it('al cerrarse deja constancia de que ya se ha visto', async () => {
    const guarda = vi.fn();
    const vista = await render(GuiaDeBienvenida, {
      inputs: { abrir: true },
      providers: [
        { provide: ALMACEN_LOCAL, useValue: { lee: () => null, guarda, borra: vi.fn() } },
        {
          provide: GUIA_DE_BIENVENIDA_PORT,
          useValue: { ejemplos: async () => exito(EJEMPLOS), simula: vi.fn() },
        },
      ],
    });
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    await userEvent.click(vista.container.querySelector<HTMLElement>('button.btn-ghost')!);
    vista.fixture.detectChanges();
    expect(guarda).toHaveBeenCalledWith('nx036.welcome.v1', expect.any(String));
    expect(vista.container.querySelector('[role=dialog]')).toBeNull();
  });
});
