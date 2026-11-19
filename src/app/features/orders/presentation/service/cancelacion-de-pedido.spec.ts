import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { CancelaPedido } from '../../application/use-case/cancela-pedido.use-case';
import { CancelacionDePedido } from './cancelacion-de-pedido';

describe('CancelacionDePedido', () => {
  const dialogo = { confirma: vi.fn(), alerta: vi.fn() };
  const cancela = { ejecuta: vi.fn() };
  let servicio: CancelacionDePedido;

  beforeEach(() => {
    vi.resetAllMocks();
    dialogo.alerta.mockResolvedValue(true);
    TestBed.configureTestingModule({
      providers: [
        CancelacionDePedido,
        { provide: DialogoStore, useValue: dialogo },
        { provide: CancelaPedido, useValue: cancela },
        {
          provide: TraduccionService,
          useValue: { t: (clave: string) => clave },
        },
      ],
    });
    servicio = TestBed.inject(CancelacionDePedido);
  });

  it('si no se confirma, no se cancela nada', async () => {
    dialogo.confirma.mockResolvedValue(false);

    expect(await servicio.pide('o1', 'CARD')).toBe(false);
    expect(cancela.ejecuta).not.toHaveBeenCalled();
  });

  /** Ya no se pregunta adónde va el dinero: un solo diálogo y el servidor devuelve al método original. */
  it('con tarjeta confirma una sola vez y avisa del reembolso al método original', async () => {
    dialogo.confirma.mockResolvedValue(true);
    cancela.ejecuta.mockResolvedValue(exito(undefined));

    expect(await servicio.pide('o1', 'CARD')).toBe(true);
    expect(dialogo.confirma).toHaveBeenCalledTimes(1);
    expect(dialogo.confirma).toHaveBeenCalledWith('order.detail.cancel_confirm');
    expect(cancela.ejecuta).toHaveBeenCalledWith('o1');
    expect(dialogo.alerta).toHaveBeenCalledWith('order.detail.cancel_ok_original', undefined, 'success');
  });

  it('con PayPal avisa también del reembolso al método original', async () => {
    dialogo.confirma.mockResolvedValue(true);
    cancela.ejecuta.mockResolvedValue(exito(undefined));

    await servicio.pide('o1', 'PAYPAL');
    expect(dialogo.confirma).toHaveBeenCalledTimes(1);
    expect(dialogo.alerta).toHaveBeenCalledWith('order.detail.cancel_ok_original', undefined, 'success');
  });

  it('con billetera confirma una vez y avisa del reembolso inmediato a la billetera', async () => {
    dialogo.confirma.mockResolvedValue(true);
    cancela.ejecuta.mockResolvedValue(exito(undefined));

    expect(await servicio.pide('o1', 'WALLET')).toBe(true);
    expect(dialogo.confirma).toHaveBeenCalledTimes(1);
    expect(cancela.ejecuta).toHaveBeenCalledWith('o1');
    expect(dialogo.alerta).toHaveBeenCalledWith('order.detail.cancel_ok', undefined, 'success');
  });

  it('sin método de pago conocido avisa como de billetera', async () => {
    dialogo.confirma.mockResolvedValue(true);
    cancela.ejecuta.mockResolvedValue(exito(undefined));

    await servicio.pide('o1');
    expect(dialogo.alerta).toHaveBeenCalledWith('order.detail.cancel_ok', undefined, 'success');
  });

  /** Un fallo silencioso deja creer que el pedido se canceló: el aviso es obligatorio. */
  it('avisa con el mensaje del servidor cuando la cancelación falla', async () => {
    dialogo.confirma.mockResolvedValue(true);
    cancela.ejecuta.mockResolvedValue(fallo(creaError('conflicto', 'Ya no se puede cancelar')));

    expect(await servicio.pide('o1', 'WALLET')).toBe(false);
    expect(dialogo.alerta).toHaveBeenCalledWith('Ya no se puede cancelar', undefined, 'error');
  });

  it('sin mensaje del servidor usa el texto de respaldo', async () => {
    dialogo.confirma.mockResolvedValue(true);
    cancela.ejecuta.mockResolvedValue(fallo(creaError('sin-conexion')));

    await servicio.pide('o1');
    expect(dialogo.alerta).toHaveBeenCalledWith('order.detail.cancel_error', undefined, 'error');
  });
});
