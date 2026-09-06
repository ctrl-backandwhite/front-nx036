import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { CARRITO_COMPARTIDO_PORT } from '@features/cart/domain/port/carrito-compartido.port';
import { PAGO_PORT } from '../../domain/port/pago.port';
import { ConfirmaElPago } from '../../application/use-case/confirma-el-pago.use-case';
import { RetornoDelPagoPage } from './retorno-del-pago.page';

@Component({ selector: 'nx-vacia', template: '' })
class Vacia {}

function monta(entradas: Record<string, string>, confirma: () => unknown) {
  const carrito = { lineas: () => [], cambiaCantidad: () => undefined, quita: () => undefined, vacia: vi.fn() };
  return {
    carrito,
    vista: render(RetornoDelPagoPage, {
      inputs: entradas,
      providers: [
        provideRouter([{ path: '**', component: Vacia }]),
        { provide: PAGO_PORT, useValue: { confirma, inicia: async () => exito({}), confirmaSimulado: async () => exito(undefined) } },
        { provide: CARRITO_COMPARTIDO_PORT, useValue: carrito },
        ConfirmaElPago,
      ],
    }),
  };
}

describe('RetornoDelPagoPage', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('confirma el cobro del lado del servidor y AHORA sí vacía la cesta', async () => {
    const confirma = vi.fn().mockResolvedValue(exito(undefined));
    const { carrito, vista } = monta({ orderId: 'o1', paymentId: 'c1', provider: 'stripe', cancelled: '' }, confirma);
    const montada = await vista;
    await montada.fixture.whenStable();
    montada.fixture.detectChanges();

    expect(confirma).toHaveBeenCalledWith('o1', 'c1');
    expect(carrito.vacia).toHaveBeenCalled();
    expect(screen.getByRole('heading')).toBeInTheDocument();
  });

  it('si la pasarela dice que se canceló, lo cuenta y ofrece reintentar', async () => {
    const confirma = vi.fn();
    const { carrito, vista } = monta({ orderId: 'o1', paymentId: 'c1', provider: 'paypal', cancelled: '1' }, confirma);
    const montada = await vista;
    await montada.fixture.whenStable();
    montada.fixture.detectChanges();

    expect(confirma).not.toHaveBeenCalled();
    expect(carrito.vacia).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /reintentar|volver a intentar/i })).toBeInTheDocument();
  });

  it('sin los identificadores no hay nada que confirmar', async () => {
    const confirma = vi.fn();
    const { vista } = monta({ orderId: '', paymentId: '', provider: '', cancelled: '' }, confirma);
    const montada = await vista;
    await montada.fixture.whenStable();
    montada.fixture.detectChanges();

    expect(confirma).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('un rechazo del servidor se enseña con su motivo', async () => {
    const confirma = vi.fn().mockResolvedValue(fallo(creaError('conflicto', 'el cobro ya estaba capturado')));
    const { vista } = monta({ orderId: 'o1', paymentId: 'c1', provider: 'stripe', cancelled: '' }, confirma);
    const montada = await vista;
    await montada.fixture.whenStable();
    montada.fixture.detectChanges();

    expect(screen.getByText('el cobro ya estaba capturado')).toBeInTheDocument();
  });

  /**
   * FALLO REAL: el temporizador se lanzaba dentro de la confirmación y no se cancelaba nunca; quien
   * pulsaba «ver pedido» o el botón de atrás durante ese segundo acababa teletransportado al pedido.
   */
  it('el salto al pedido se cancela si la pantalla se destruye antes', async () => {
    const confirma = vi.fn().mockResolvedValue(exito(undefined));
    const { vista } = monta({ orderId: 'o1', paymentId: 'c1', provider: 'stripe', cancelled: '' }, confirma);
    const montada = await vista;
    await montada.fixture.whenStable();
    montada.fixture.detectChanges();

    const router = TestBed.inject(Router);
    const navegar = vi.spyOn(router, 'navigate');
    montada.fixture.destroy();
    vi.advanceTimersByTime(3000);

    expect(navegar).not.toHaveBeenCalled();
  });

  it('tras confirmar lleva al pedido, ya pagado', async () => {
    const confirma = vi.fn().mockResolvedValue(exito(undefined));
    const { vista } = monta({ orderId: 'o1', paymentId: 'c1', provider: 'stripe', cancelled: '' }, confirma);
    const montada = await vista;
    await montada.fixture.whenStable();
    montada.fixture.detectChanges();

    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate');
    vi.advanceTimersByTime(1500);

    expect(navegar).toHaveBeenCalledWith(['/orders', 'o1'], { queryParams: { placed: 1, paid: 1 } });
  });
});
