import { render, screen, waitFor } from '@testing-library/angular';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { PANEL_PORT, PanelPort } from '../../../domain/gestion/port/panel.port';
import { TIPOS_DE_CAMBIO_PORT } from '../../../domain/gestion/port/tipos-de-cambio.port';
import { ConsultaSeries } from '../../../application/gestion/use-case/panel.use-case';
import { ImportesStore } from '../../../application/gestion/state/importes.store';
import { GraficasDelPanel } from './graficas-del-panel';
import { ultimosDias } from '../../../domain/gestion/model/panel';

/**
 * Las pruebas que MONTAN un componente tardan más de lo que Vitest espera por defecto (5 s) cuando hay
 * varios equipos compilando a la vez: el arranque de Angular compite por la máquina. El plazo se sube
 * aquí para que un fallo signifique lo que tiene que significar —que la lógica está mal— y no que el
 * ordenador iba cargado.
 */
vi.setConfig({ testTimeout: 30_000 });


/** Un puerto que solo sabe de series: el resto no lo usa esta pieza. */
function puerto(series: PanelPort['series']): PanelPort {
  return {
    metricas: async () => fallo(creaError('no-encontrado')),
    pedidosRecientes: async () => exito([]),
    series,
  };
}

async function monta(series: PanelPort['series']) {
  return render(GraficasDelPanel, {
    providers: [
      { provide: PANEL_PORT, useValue: puerto(series) },
      { provide: TIPOS_DE_CAMBIO_PORT, useValue: { vigentes: async () => exito([]) } },
      ConsultaSeries, ImportesStore,
    ],
  });
}

describe('GraficasDelPanel', () => {
  it('pinta una barra por día del último mes, con los huecos a cero', async () => {
    const hoy = ultimosDias(30).at(-1) as string;
    const { container } = await monta(async () =>
      exito({ pedidosPorDia: { [hoy]: 4 }, gmvCentimosPorDia: { [hoy]: 25000 } }),
    );

    await waitFor(() => expect(container.querySelectorAll('rect').length).toBe(60));
    // Los totales cuentan el mes entero, no solo los días con datos.
    expect(screen.getByText(/^4 ·/)).toBeInTheDocument();
  });

  it('mientras carga enseña un hueco, no una gráfica a cero', async () => {
    let resuelve: () => void = () => undefined;
    const espera = new Promise<void>((r) => (resuelve = r));
    const { container } = await monta(async () => {
      await espera;
      return exito({ pedidosPorDia: {}, gmvCentimosPorDia: {} });
    });

    expect(container.querySelectorAll('rect')).toHaveLength(0);
    expect(container.querySelector('.animate-pulse')).toBeTruthy();

    resuelve();
    await waitFor(() => expect(container.querySelector('.animate-pulse')).toBeNull());
  });

  /**
   * Con la serie caída se deja de cargar igualmente: girar para siempre haría creer que el dato está
   * a punto de llegar.
   */
  it('con la serie caída deja de cargar y pinta el mes a cero', async () => {
    const { container } = await monta(async () => fallo(creaError('error-del-servidor')));

    await waitFor(() => expect(container.querySelector('.animate-pulse')).toBeNull());
    expect(container.querySelectorAll('rect').length).toBe(60);
  });
});
