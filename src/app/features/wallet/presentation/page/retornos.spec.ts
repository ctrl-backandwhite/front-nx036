import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exito } from '@shared/result/result';
import { ConfirmaRecarga } from '../../application/use-case/confirma-recarga.use-case';
import { RetornoDeRecargaPage } from './retorno-de-recarga.page';
import { RetornoDePaypalPage } from './retorno-de-paypal.page';

function enEspanol(): void {
  document.cookie = 'nx036-locale=es';
}

describe('vueltas de la pasarela', () => {
  const confirmacion = { ejecuta: vi.fn() };

  beforeEach(() => {
    enEspanol();
    vi.resetAllMocks();
    confirmacion.ejecuta.mockResolvedValue(exito(undefined));
  });

  const proveedores = [
    provideRouter([]),
    { provide: ConfirmaRecarga, useValue: confirmacion },
  ];

  it('la vuelta del cobro hospedado cierra el pago por la pasarela', async () => {
    await render(RetornoDeRecargaPage, { inputs: { paymentId: 'p1' }, providers: proveedores });

    expect(await screen.findByText('Recarga completada')).toBeInTheDocument();
    expect(confirmacion.ejecuta).toHaveBeenCalledWith('p1', 'pasarela');
  });

  it('y respeta el aviso de cancelación que llega en la dirección', async () => {
    await render(RetornoDeRecargaPage, {
      inputs: { paymentId: 'p1', cancelled: '1' },
      providers: proveedores,
    });

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(confirmacion.ejecuta).not.toHaveBeenCalled();
  });

  it('la vuelta de PayPal captura el pago aprobado', async () => {
    await render(RetornoDePaypalPage, { inputs: { paymentId: 'p1' }, providers: proveedores });

    expect(await screen.findByText('Pago acreditado')).toBeInTheDocument();
    expect(confirmacion.ejecuta).toHaveBeenCalledWith('p1', 'paypal');
  });

  /**
   * PayPal devuelve el identificador unas veces como `paymentId` y otras como `token`. Quedarse con uno
   * dejaba la captura sin hacer y el dinero aprobado sin cobrar.
   */
  it('PayPal también acepta el identificador como «token»', async () => {
    await render(RetornoDePaypalPage, { inputs: { token: 'tok-1' }, providers: proveedores });

    await screen.findByText('Pago acreditado');
    expect(confirmacion.ejecuta).toHaveBeenCalledWith('tok-1', 'paypal');
  });
});
