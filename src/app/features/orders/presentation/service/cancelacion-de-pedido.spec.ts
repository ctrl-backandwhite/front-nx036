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
          useValue: { t: (clave: string) => clave, tCon: (clave: string) => clave },
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

  /** Lo pagado con la cartera vuelve a la cartera: preguntar sobraría. */
  it('con pago por cartera solo pregunta una vez y devuelve a la cartera', async () => {
    dialogo.confirma.mockResolvedValue(true);
    cancela.ejecuta.mockResolvedValue(exito(undefined));

    expect(await servicio.pide('o1', 'WALLET')).toBe(true);
    expect(dialogo.confirma).toHaveBeenCalledTimes(1);
    expect(cancela.ejecuta).toHaveBeenCalledWith('o1', true);
  });

  it('con tarjeta pregunta adónde va el reembolso y respeta la respuesta', async () => {
    dialogo.confirma.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    cancela.ejecuta.mockResolvedValue(exito(undefined));

    expect(await servicio.pide('o1', 'CARD')).toBe(true);
    expect(dialogo.confirma).toHaveBeenCalledTimes(2);
    expect(cancela.ejecuta).toHaveBeenCalledWith('o1', false);
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
