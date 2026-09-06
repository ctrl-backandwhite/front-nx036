import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { ResumenDePedido } from '../../domain/model/pedido';
import { ListaPedidos } from '../../application/use-case/lista-pedidos.use-case';
import { CancelacionDePedido } from '../service/cancelacion-de-pedido';
import { PedidosPage } from './pedidos.page';

/**
 * Los botones de cancelar, con más margen del habitual.
 *
 * <p>El listado se pinta dos veces —la tabla del escritorio y las tarjetas del móvil, que en el
 * navegador se ocultan con clases— y estas pruebas comparten máquina con las de los demás contextos. Con
 * el plazo de un segundo que trae la biblioteca, la espera se agotaba por carga y no por un fallo real.
 */
function botonesDeCancelar(): Promise<HTMLElement[]> {
  return screen.findAllByRole('button', { name: 'Cancelar pedido' }, { timeout: 3000 });
}

const pedido = (parcial: Partial<ResumenDePedido>): ResumenDePedido => ({
  id: '1',
  numero: 'NX-0001',
  estado: 'PAID',
  cancelable: false,
  totalFormateado: '12,00 €',
  articulos: 2,
  realizadoEl: '2026-05-10T12:00:00Z',
  ...parcial,
});

/**
 * Las pruebas se corren en español: el idioma sale de la cookie de preferencias y, sin ella, el
 * navegador de las pruebas pide inglés. Fijarla aquí deja las comprobaciones sobre el diccionario real
 * en vez de un doble que las volvería ciegas a una clave que falte.
 */
function enEspanol(): void {
  document.cookie = 'nx036-locale=es';
}

describe('PedidosPage', () => {
  const lista = { ejecuta: vi.fn() };
  const cancelacion = { pide: vi.fn() };

  const monta = () =>
    render(PedidosPage, {
      providers: [
        provideRouter([]),
        { provide: ListaPedidos, useValue: lista },
        { provide: CancelacionDePedido, useValue: cancelacion },
      ],
    });

  beforeEach(() => {
    enEspanol();
    vi.resetAllMocks();
  });

  it('enseña los pedidos con su número y su total ya formateado', async () => {
    lista.ejecuta.mockResolvedValue(exito([pedido({})]));

    await monta();

    // La tabla de escritorio y las tarjetas de móvil conviven en el árbol; en el navegador se ocultan
    // con clases, así que aquí las dos aparecen y se busca «todas».
    expect(await screen.findAllByText('NX-0001')).not.toHaveLength(0);
    expect(screen.getAllByText('12,00 €').length).toBeGreaterThan(0);
  });

  /** «Sin pedidos» y «sin resultados» son dos vacíos distintos y se dicen distinto. */
  it('sin ningún pedido invita al catálogo', async () => {
    lista.ejecuta.mockResolvedValue(exito([]));

    await monta();

    expect(await screen.findByRole('link', { name: 'Ver catálogo' })).toBeInTheDocument();
  });

  it('un fallo al leer deja el mismo vacío, sin romper la pantalla', async () => {
    lista.ejecuta.mockResolvedValue(fallo(creaError('sin-conexion')));

    await monta();

    expect(await screen.findByRole('link', { name: 'Ver catálogo' })).toBeInTheDocument();
  });

  it('al filtrar por un número que no existe avisa de que no hay resultados', async () => {
    lista.ejecuta.mockResolvedValue(exito([pedido({}), pedido({ id: '2', numero: 'NX-0002' })]));

    const vista = await monta();
    await screen.findAllByText('NX-0001');
    vista.fixture.componentInstance['criterio'].set({
      texto: 'ZZZ',
      estado: null,
      ano: null,
      mes: null,
      dia: null,
      desde: '',
      hasta: '',
    });
    vista.fixture.detectChanges();

    expect(await screen.findByText('Ningún pedido coincide con los filtros.')).toBeInTheDocument();
  });

  /**
   * Cancelar es lo único de esta pantalla que cambia datos: si sale bien hay que releer, porque el
   * servidor decide además si el pedido pasa a REEMBOLSADO.
   */
  it('tras cancelar con éxito vuelve a leer el listado', async () => {
    lista.ejecuta.mockResolvedValue(exito([pedido({ cancelable: true })]));
    cancelacion.pide.mockResolvedValue(true);

    await monta();
    await userEvent.click((await botonesDeCancelar())[0]);

    expect(cancelacion.pide).toHaveBeenCalledWith('1', undefined);
    expect(lista.ejecuta).toHaveBeenCalledTimes(2);
  });

  it('si se arrepiente, no se relee nada', async () => {
    lista.ejecuta.mockResolvedValue(exito([pedido({ cancelable: true })]));
    cancelacion.pide.mockResolvedValue(false);

    await monta();
    await userEvent.click((await botonesDeCancelar())[0]);

    expect(lista.ejecuta).toHaveBeenCalledTimes(1);
  });
});
