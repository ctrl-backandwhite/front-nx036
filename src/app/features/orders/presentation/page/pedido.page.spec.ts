import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { Pedido } from '../../domain/model/pedido';
import { ConsultaPedido } from '../../application/use-case/consulta-pedido.use-case';
import { SiguePedido } from '../../application/use-case/sigue-pedido.use-case';
import { DescargaFactura } from '../../application/use-case/descarga-factura.use-case';
import { CancelacionDePedido } from '../service/cancelacion-de-pedido';
import { PedidoPage } from './pedido.page';

const pedido = (parcial: Partial<Pedido> = {}): Pedido => ({
  id: 'o1',
  numero: 'NX-0001',
  estado: 'SHIPPED',
  cancelable: false,
  subtotalFormateado: '10,00 €',
  envioFormateado: '2,00 €',
  impuestosFormateado: '1,00 €',
  descuentoFormateado: '',
  totalFormateado: '13,00 €',
  lineas: [
    {
      id: 'l1',
      titulo: 'Gorro de lana',
      cantidad: 2,
      precioUnitarioFormateado: '5,00 €',
      totalDeLineaFormateado: '10,00 €',
    },
  ],
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

describe('PedidoPage', () => {
  const consulta = { ejecuta: vi.fn() };
  const sigue = { ejecuta: vi.fn() };
  const descarga = { ejecuta: vi.fn() };
  const cancelacion = { pide: vi.fn() };
  const dialogo = { alerta: vi.fn().mockResolvedValue(true) };

  const monta = (entradas: Record<string, string> = {}) =>
    render(PedidoPage, {
      inputs: { id: 'o1', ...entradas },
      providers: [
        provideRouter([]),
        { provide: ConsultaPedido, useValue: consulta },
        { provide: SiguePedido, useValue: sigue },
        { provide: DescargaFactura, useValue: descarga },
        { provide: CancelacionDePedido, useValue: cancelacion },
        { provide: DialogoStore, useValue: dialogo },
      ],
    });

  beforeEach(() => {
    enEspanol();
    vi.resetAllMocks();
    dialogo.alerta.mockResolvedValue(true);
    sigue.ejecuta.mockResolvedValue(exito({ hitos: [], bultos: [] }));
  });

  afterEach(() => vi.useRealTimers());

  it('pinta el número, el desglose y los productos', async () => {
    consulta.ejecuta.mockResolvedValue(exito(pedido()));

    await monta();

    expect(await screen.findByText('NX-0001')).toBeInTheDocument();
    expect(screen.getByText('13,00 €')).toBeInTheDocument();
    expect(screen.getByText('Gorro de lana')).toBeInTheDocument();
  });

  it('un pedido que no existe lo dice, en vez de dejar la pantalla en blanco', async () => {
    consulta.ejecuta.mockResolvedValue(fallo(creaError('no-encontrado')));

    await monta();

    expect(await screen.findByText('Pedido no encontrado.')).toBeInTheDocument();
  });

  /** Solo se ofrece la factura cuando el pedido llegó a cobrarse. */
  it('no ofrece la factura de un pedido sin pagar', async () => {
    consulta.ejecuta.mockResolvedValue(exito(pedido({ estado: 'AWAITING_PAYMENT' })));

    await monta();
    await screen.findByText('NX-0001');

    expect(screen.queryByRole('button', { name: 'Descargar factura' })).toBeNull();
  });

  it('avisa cuando la factura no se puede descargar', async () => {
    consulta.ejecuta.mockResolvedValue(exito(pedido()));
    descarga.ejecuta.mockResolvedValue(fallo(creaError('error-del-servidor', 'No disponible')));

    await monta();
    await userEvent.click(await screen.findByRole('button', { name: 'Descargar factura' }));

    expect(dialogo.alerta).toHaveBeenCalledWith('No disponible', undefined, 'error');
  });

  it('tras cancelar con éxito vuelve a leer la ficha', async () => {
    consulta.ejecuta.mockResolvedValue(exito(pedido({ cancelable: true, metodoDePago: 'CARD' })));
    cancelacion.pide.mockResolvedValue(true);

    await monta();
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar pedido' }));

    expect(cancelacion.pide).toHaveBeenCalledWith('o1', 'CARD');
    expect(consulta.ejecuta).toHaveBeenCalledTimes(2);
  });

  /**
   * `?paid=1` lo ponen SOLO los pagos externos: si se pagó con la cartera, el mensaje no debe hablar de
   * ella como si el cobro estuviera pendiente.
   */
  it('el mensaje de pedido recién hecho distingue el pago externo', async () => {
    consulta.ejecuta.mockResolvedValue(exito(pedido()));

    await monta({ placed: '1', paid: '1' });

    expect(await screen.findByText('¡Pedido confirmado!')).toBeInTheDocument();
  });

  it('sin el aviso de recién creado no se enseña la felicitación', async () => {
    consulta.ejecuta.mockResolvedValue(exito(pedido()));

    await monta();
    await screen.findByText('NX-0001');

    expect(screen.queryByText('¡Pedido confirmado!')).toBeNull();
  });

  /** Si el transportista tiene un mal minuto, no se borra lo último que se sabía. */
  it('un fallo del seguimiento no borra lo ya cargado', async () => {
    consulta.ejecuta.mockResolvedValue(exito(pedido()));
    sigue.ejecuta.mockResolvedValueOnce(
      exito({ numeroDeSeguimiento: 'LP1', hitos: [], bultos: [] }),
    );

    const vista = await monta();
    await screen.findByText('NX-0001');
    sigue.ejecuta.mockResolvedValue(fallo(creaError('sin-conexion')));
    await vista.fixture.componentInstance['cargaSeguimiento']('o1');

    expect(vista.fixture.componentInstance['seguimiento']()?.numeroDeSeguimiento).toBe('LP1');
  });
});
