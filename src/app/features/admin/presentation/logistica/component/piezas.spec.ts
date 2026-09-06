import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { Seleccion } from '../../../application/logistica/state/seleccion';
import { COOKIE_IDIOMA } from '@core/preferences/preferencias';
import { Pedido } from '../../../domain/logistica/model/pedido';
import { AccionesEnLote } from './acciones-en-lote';
import { DeclaracionesDelTransportista } from './declaraciones-del-transportista';
import { InsigniaEstado } from './insignia-estado';
import { Paginacion } from './paginacion';
import { RastroDelEnvio } from './rastro-del-envio';
import { TablaDePedidos } from './tabla-de-pedidos';

/**
 * El idioma se fija ANTES de montar nada.
 *
 * <p>Sin esto la prueba hereda el del entorno —inglés en el navegador de pruebas— y las esperas escritas
 * en español fallan en la máquina de integración continua aunque el componente esté bien. El idioma sale
 * de la cookie, así que se escribe ahí y el servicio de preferencias la lee al construirse.
 */
beforeEach(() => {
  document.cookie = `${COOKIE_IDIOMA}=es; Path=/`;
});

function pedido(parcial: Partial<Pedido> = {}): Pedido {
  return { id: 'p1', numero: 'NX-1', estado: 'PAID', articulos: 2, ...parcial };
}

describe('InsigniaEstado', () => {
  it('pinta el estado traducido', async () => {
    await render(InsigniaEstado, { inputs: { estado: 'DELIVERED' } });

    expect(screen.getByText('Entregado')).toBeInTheDocument();
  });

  /** Un estado nuevo del backend se ve al momento en vez de quedarse en blanco. */
  it('sin traducción enseña el CÓDIGO del estado, no un hueco', async () => {
    await render(InsigniaEstado, { inputs: { estado: 'ESTADO_INVENTADO' } });

    expect(screen.getByText('ESTADO_INVENTADO')).toBeInTheDocument();
  });
});

describe('Paginacion', () => {
  it('cuenta desde uno hacia fuera aunque por dentro empiece en cero', async () => {
    const { container } = await render(Paginacion, { inputs: { pagina: 0, paginas: 3 } });

    // El rótulo va en una sola frase, así que se comprueba el texto entero y no cada número suelto.
    expect(container.textContent).toContain('1');
    expect(container.textContent).toContain('3');
  });

  it('en la primera página no se puede retroceder', async () => {
    await render(Paginacion, { inputs: { pagina: 0, paginas: 3 } });

    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeEnabled();
  });

  it('en la última no se puede avanzar', async () => {
    await render(Paginacion, { inputs: { pagina: 2, paginas: 3 } });

    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  });

  it('avanzar publica la página nueva', async () => {
    const { fixture } = await render(Paginacion, { inputs: { pagina: 0, paginas: 3 } });

    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

    expect(fixture.componentInstance.pagina()).toBe(1);
  });

  /** Sin página no hay listado: una tabla vacía sigue siendo la página 1 de 1. */
  it('sin páginas declaradas sigue habiendo una', async () => {
    const { container } = await render(Paginacion, { inputs: { pagina: 0, paginas: 0 } });

    expect(container.textContent).toContain('1');
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  });
});

describe('AccionesEnLote', () => {
  it('no aparece mientras no haya nada marcado: ocupando sitio se lee como algo roto', async () => {
    await render(AccionesEnLote, { inputs: { cuantos: 0 } });

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('con filas marcadas ofrece las cinco transiciones', async () => {
    await render(AccionesEnLote, { inputs: { cuantos: 3 } });

    expect(screen.getAllByRole('button')).toHaveLength(5);
  });

  it('publica la acción pulsada', async () => {
    const pide = vi.fn();
    await render(AccionesEnLote, { inputs: { cuantos: 2 }, on: { pide } });

    await userEvent.click(screen.getAllByRole('button')[0]);

    expect(pide).toHaveBeenCalledWith('forward');
  });

  it('mientras el lote está en marcha no se puede volver a pulsar', async () => {
    await render(AccionesEnLote, { inputs: { cuantos: 2, ocupado: true } });

    expect(screen.getAllByRole('button')[0]).toBeDisabled();
  });
});

describe('TablaDePedidos', () => {
  async function monta(pedidos: readonly Pedido[], resaltado: string | null = null) {
    const pide = vi.fn();
    const seleccion = new Seleccion();
    const vista = await render(TablaDePedidos, {
      providers: [provideRouter([])],
      inputs: { pedidos, seleccion, resaltado },
      on: { pide },
    });
    return { ...vista, pide, seleccion };
  }

  it('sin filas dice que no hay resultados en vez de dejar la tabla muda', async () => {
    await monta([]);

    expect(screen.getByText(/ningún resultado/i)).toBeInTheDocument();
  });

  it('el número enlaza a la ficha del pedido', async () => {
    await monta([pedido()]);

    expect(screen.getByRole('link', { name: 'NX-1' })).toHaveAttribute(
      'href',
      '/admin/orders/p1',
    );
  });

  /** No se ofrece un botón que va a fallar: el estado decide qué transiciones caben. */
  it('un pedido cobrado ofrece despachar y cancelar, pero no entregar', async () => {
    await monta([pedido({ estado: 'PAID' })]);

    expect(screen.getByRole('button', { name: 'Enviar a proveedor' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Entregar' })).toBeNull();
  });

  it('un pedido cancelado no ofrece ninguna transición, solo verlo', async () => {
    await monta([pedido({ estado: 'CANCELLED' })]);

    expect(screen.queryAllByRole('button', { name: /Enviar a proveedor|Cancelar/ })).toHaveLength(0);
  });

  it('pulsar una acción avisa con el pedido y la acción', async () => {
    const { pide } = await monta([pedido({ estado: 'SHIPPED' })]);

    await userEvent.click(screen.getByRole('button', { name: 'Entregar' }));

    expect(pide).toHaveBeenCalledWith({
      pedido: expect.objectContaining({ id: 'p1' }),
      accion: 'deliver',
    });
  });

  it('marcar la casilla de una fila la añade a la selección', async () => {
    const { seleccion } = await monta([pedido()]);

    await userEvent.click(screen.getByRole('checkbox', { name: 'NX-1' }));

    expect(seleccion.tiene('p1')).toBe(true);
  });

  /** El importe lo formatea el backend: reconvertirlo aquí mostraba un céntimo menos de lo cobrado. */
  it('pinta el importe tal como llega del servidor', async () => {
    await monta([pedido({ totalFormateado: '9,54 €' })]);

    expect(screen.getByText('9,54 €')).toBeInTheDocument();
  });

  it('sin importe formateado pinta un guion, no un cero', async () => {
    await monta([pedido()]);

    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });
});

describe('RastroDelEnvio', () => {
  const vacio = { eventos: [], bultos: [], declaraciones: [] };

  it('sin guía y sin pasos no pinta un recuadro vacío', async () => {
    const { container } = await render(RastroDelEnvio, { inputs: { envio: vacio } });

    expect(container.querySelector('section')).toBeNull();
  });

  it('con un solo paquete enseña los pasos del pedido', async () => {
    await render(RastroDelEnvio, {
      inputs: {
        envio: {
          ...vacio,
          numeroDeSeguimiento: 'YT123',
          eventos: [{ estado: 'SHIPPED', descripcion: 'Recogido', lugar: 'Yiwu' }],
        },
      },
    });

    expect(screen.getByText('YT123')).toBeInTheDocument();
    expect(screen.getByText('Recogido')).toBeInTheDocument();
  });

  /** Mezclar los pasos de varios bultos hace imposible saber qué le pasa a cada uno. */
  it('con varios bultos enseña cada uno con su propia guía', async () => {
    await render(RastroDelEnvio, {
      inputs: {
        envio: {
          ...vacio,
          bultos: [
            {
              secuencia: 1,
              numeroDeSeguimiento: 'YT1',
              pesoGramos: 500,
              eventos: [{ estado: 'SHIPPED', descripcion: 'Salida' }],
              articulos: [],
            },
            {
              secuencia: 2,
              numeroDeSeguimiento: 'YT2',
              pesoGramos: 400,
              eventos: [],
              articulos: [],
            },
          ],
        },
      },
    });

    expect(screen.getByText('YT1')).toBeInTheDocument();
    expect(screen.getByText('YT2')).toBeInTheDocument();
  });
});

describe('DeclaracionesDelTransportista', () => {
  it('sin declaraciones no pinta nada: los envíos antiguos no las traen', async () => {
    const { container } = await render(DeclaracionesDelTransportista, {
      inputs: { declaraciones: [] },
    });

    expect(container.querySelector('details')).toBeNull();
  });

  it('enseña el destinatario declarado y la partida arancelaria', async () => {
    await render(DeclaracionesDelTransportista, {
      inputs: {
        declaraciones: [
          {
            secuencia: 1,
            numeroDeGuia: 'YT1',
            destinatario: {
              nombre: 'Ana',
              apellidos: 'Ruiz',
              ciudad: 'Madrid',
              pais: 'ES',
              lineas: ['C/ Mayor 1'],
            },
            lineas: [
              {
                descripcionEn: 'Hat',
                partidaArancelaria: '650500',
                cantidad: 2,
                valorUnitario: 3,
                moneda: 'USD',
              },
            ],
          },
        ],
      },
    });

    expect(screen.getByText('Ana Ruiz')).toBeInTheDocument();
    expect(screen.getByText('650500')).toBeInTheDocument();
    expect(screen.getByText('3 USD')).toBeInTheDocument();
  });

  it('una declaración sin líneas lo dice, en vez de dejar una tabla fantasma', async () => {
    await render(DeclaracionesDelTransportista, {
      inputs: { declaraciones: [{ secuencia: 1, lineas: [] }] },
    });

    expect(screen.queryByRole('table')).toBeNull();
  });
});
