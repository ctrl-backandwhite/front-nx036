import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { render, screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { COOKIE_IDIOMA } from '@core/preferences/preferencias';
import { APP_CONFIG } from '@core/config/app-config';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import {
  ALTA_DE_PEDIDOS_PORT,
  BUSCADOR_DE_PRODUCTOS_PORT,
  LECTOR_DE_PEDIDOS_PEGADOS_PORT,
  PEDIDOS_ADMIN_PORT,
  TRANSICIONES_DE_PEDIDO_PORT,
} from '../../../domain/logistica/port/pedidos-admin.port';
import { Pedido } from '../../../domain/logistica/model/pedido';
import {
  BuscaPedidos,
  CambiaEstadoDePedido,
  CambiaEstadoEnLote,
  ReindexaPedidos,
} from '../../../application/logistica/use-case/gestiona-pedidos.use-case';
import {
  BuscaProductosParaPedido,
  CreaPedido,
  CreaPedidoDeDemostracion,
  ImportaPedidos,
} from '../../../application/logistica/use-case/alta-de-pedidos.use-case';
import { LeePedidosPegados } from '../../../application/logistica/use-case/lee-pedidos-pegados.use-case';
import { PedidosPage } from './pedidos.page';

/**
 * Montar la pantalla entera con su tabla y sus diálogos tarda más que el plazo por defecto, sobre todo
 * en la primera prueba del fichero, que además compila la plantilla. Se amplía para el fichero entero:
 * un plazo corto aquí solo produce fallos que no señalan ningún defecto.
 */
vi.setConfig({ testTimeout: 30_000 });

function pedido(parcial: Partial<Pedido> = {}): Pedido {
  return { id: 'p1', numero: 'NX-1', estado: 'PAID', articulos: 2, ...parcial };
}

function dobles(pedidos: readonly Pedido[]) {
  return {
    lectura: {
      busca: vi.fn().mockResolvedValue(
        exito({ pedidos, total: pedidos.length, paginas: 1, pagina: 0 }),
      ),
      ficha: vi.fn(),
      reindexa: vi.fn().mockResolvedValue(exito(4)),
    },
    transiciones: {
      aplica: vi.fn().mockResolvedValue(exito(undefined)),
      aplicaEnLote: vi
        .fn()
        .mockResolvedValue(exito({ correctas: 1, fallidas: 0, errores: [] })),
    },
    alta: {
      crea: vi.fn(),
      importa: vi.fn(),
      creaDemostracion: vi.fn().mockResolvedValue(exito(undefined)),
    },
  };
}

async function monta(pedidos: readonly Pedido[], produccion = true) {
  document.cookie = `${COOKIE_IDIOMA}=es; Path=/`;
  const puertos = dobles(pedidos);
  const vista = await render(PedidosPage, {
    providers: [
      provideRouter([]),
      BuscaPedidos,
      CambiaEstadoDePedido,
      CambiaEstadoEnLote,
      ReindexaPedidos,
      CreaPedidoDeDemostracion,
      // Los dos diálogos son hijos de la pantalla: sus casos de uso hacen falta aunque estén cerrados.
      CreaPedido,
      ImportaPedidos,
      BuscaProductosParaPedido,
      LeePedidosPegados,
      { provide: PEDIDOS_ADMIN_PORT, useValue: puertos.lectura },
      { provide: TRANSICIONES_DE_PEDIDO_PORT, useValue: puertos.transiciones },
      { provide: ALTA_DE_PEDIDOS_PORT, useValue: puertos.alta },
      { provide: LECTOR_DE_PEDIDOS_PEGADOS_PORT, useValue: { interpreta: vi.fn() } },
      { provide: BUSCADOR_DE_PRODUCTOS_PORT, useValue: { busca: vi.fn() } },
      { provide: APP_CONFIG, useValue: { apiBase: '', produccion } },
    ],
  });
  await waitFor(() => expect(puertos.lectura.busca).toHaveBeenCalled());
  vista.fixture.detectChanges();
  return { ...vista, puertos };
}

describe('PedidosPage', () => {
  it('pide el listado al abrirse y lo pinta', async () => {
    await monta([pedido({ numero: 'NX-1' })]);

    expect(await screen.findByText('NX-1')).toBeInTheDocument();
  });

  /** Sembrar pedidos de mentira solo tiene sentido fuera de producción. */
  it('en producción NO ofrece el pedido de demostración', async () => {
    await monta([], true);

    expect(screen.queryByRole('button', { name: /demo/i })).toBeNull();
  });

  it('fuera de producción sí lo ofrece, y sembrarlo recarga el listado', async () => {
    const { puertos } = await monta([], false);

    const boton = screen.getByRole('button', { name: /demo/i });
    await userEvent.click(boton);

    await waitFor(() => expect(puertos.alta.creaDemostracion).toHaveBeenCalled());
    await waitFor(() => expect(puertos.lectura.busca).toHaveBeenCalledTimes(2));
  });

  it('una acción sobre una fila se CONFIRMA antes de mandarla', async () => {
    const { puertos } = await monta([pedido({ estado: 'PAID' })]);
    const dialogo = TestBed.inject(DialogoStore);
    vi.spyOn(dialogo, 'confirma').mockResolvedValue(true);

    await userEvent.click(await screen.findByRole('button', { name: 'Enviar a proveedor' }));

    await waitFor(() => expect(puertos.transiciones.aplica).toHaveBeenCalledWith('p1', 'forward'));
  });

  it('si se cancela la confirmación no se manda nada', async () => {
    const { puertos } = await monta([pedido({ estado: 'PAID' })]);
    vi.spyOn(TestBed.inject(DialogoStore), 'confirma').mockResolvedValue(false);

    await userEvent.click(await screen.findByRole('button', { name: 'Enviar a proveedor' }));

    await waitFor(() => expect(puertos.transiciones.aplica).not.toHaveBeenCalled());
  });

  /**
   * Un cambio de estado que falla NO puede quedarse en silencio: si al producto le faltan datos de
   * aduana, el pedido se queda cobrado y atascado y nadie vuelve a mirarlo.
   */
  it('el mensaje del backend se enseña cuando la transición falla', async () => {
    const { puertos } = await monta([pedido({ estado: 'PAID' })]);
    puertos.transiciones.aplica.mockResolvedValue(
      fallo(creaError('peticion-invalida', 'falta partida arancelaria (HSCode)')),
    );
    vi.spyOn(TestBed.inject(DialogoStore), 'confirma').mockResolvedValue(true);
    const avisos = TestBed.inject(AvisosStore);

    await userEvent.click(await screen.findByRole('button', { name: 'Enviar a proveedor' }));

    await waitFor(() =>
      expect(avisos.avisos().some((a) => a.mensaje.includes('HSCode'))).toBe(true),
    );
  });

  it('sin nada marcado no se ofrecen acciones en lote', async () => {
    await monta([pedido()]);

    expect(screen.queryByRole('button', { name: /Reembolsar/ })).toBeNull();
  });

  it('marcar una fila saca la barra de acciones en lote', async () => {
    await monta([pedido()]);

    await userEvent.click(await screen.findByRole('checkbox', { name: 'NX-1' }));

    expect(await screen.findByRole('button', { name: /Reembolsar/ })).toBeInTheDocument();
  });

  /** «Ninguno elegible» no es un error del servidor: es que lo marcado no admite esa acción. */
  it('en lote, si ninguno admite la acción, avisa sin llamar al backend', async () => {
    const { puertos } = await monta([pedido({ estado: 'CANCELLED' })]);
    const avisos = TestBed.inject(AvisosStore);

    await userEvent.click(await screen.findByRole('checkbox', { name: 'NX-1' }));
    await userEvent.click(await screen.findByRole('button', { name: /Reembolsar/ }));

    await waitFor(() => expect(avisos.avisos().length).toBeGreaterThan(0));
    expect(puertos.transiciones.aplicaEnLote).not.toHaveBeenCalled();
  });

  it('en lote manda solo los elegibles tras confirmar', async () => {
    const { puertos } = await monta([pedido({ estado: 'PAID' })]);
    vi.spyOn(TestBed.inject(DialogoStore), 'confirma').mockResolvedValue(true);

    await userEvent.click(await screen.findByRole('checkbox', { name: 'NX-1' }));
    // El mismo rótulo aparece en la barra del lote y en la fila; el de la barra va antes.
    await userEvent.click(screen.getAllByRole('button', { name: /Enviar a proveedor/ })[0]);

    await waitFor(() =>
      expect(puertos.transiciones.aplicaEnLote).toHaveBeenCalledWith(['p1'], 'forward'),
    );
  });

  it('el reindexado dice cuántos se indexaron', async () => {
    const { puertos } = await monta([]);
    const avisos = TestBed.inject(AvisosStore);

    await userEvent.click(screen.getByRole('button', { name: /Reindexar/i }));

    await waitFor(() => expect(puertos.lectura.reindexa).toHaveBeenCalled());
    await waitFor(() => expect(avisos.avisos().some((a) => a.mensaje.includes('4'))).toBe(true));
  });

  it('un fallo al listar se avisa en vez de dejar la tabla muda', async () => {
    document.cookie = `${COOKIE_IDIOMA}=es; Path=/`;
    const puertos = dobles([]);
    puertos.lectura.busca.mockResolvedValue(fallo(creaError('sin-conexion', 'sin red')));
    await render(PedidosPage, {
      providers: [
        provideRouter([]),
        BuscaPedidos,
        CambiaEstadoDePedido,
        CambiaEstadoEnLote,
        ReindexaPedidos,
        CreaPedidoDeDemostracion,
        CreaPedido,
        ImportaPedidos,
        BuscaProductosParaPedido,
        LeePedidosPegados,
        { provide: PEDIDOS_ADMIN_PORT, useValue: puertos.lectura },
        { provide: TRANSICIONES_DE_PEDIDO_PORT, useValue: puertos.transiciones },
        { provide: ALTA_DE_PEDIDOS_PORT, useValue: puertos.alta },
        { provide: LECTOR_DE_PEDIDOS_PEGADOS_PORT, useValue: { interpreta: vi.fn() } },
        { provide: BUSCADOR_DE_PRODUCTOS_PORT, useValue: { busca: vi.fn() } },
        { provide: APP_CONFIG, useValue: { apiBase: '', produccion: true } },
      ],
    });

    const avisos = TestBed.inject(AvisosStore);
    await waitFor(() => expect(avisos.avisos().some((a) => a.tipo === 'error')).toBe(true));
  });

  it('abre el diálogo de importación', async () => {
    await monta([]);

    await userEvent.click(screen.getByRole('button', { name: /Importar órdenes/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('abre el diálogo de alta manual', async () => {
    await monta([]);

    await userEvent.click(screen.getByRole('button', { name: /Crear orden$/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});
