import { Router, provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { ConfirmaRecarga } from '../../application/use-case/confirma-recarga.use-case';
import { RetornoDePago, TextosDeRetorno } from './retorno-de-pago';

function enEspanol(): void {
  document.cookie = 'nx036-locale=es';
}

const TEXTOS: TextosDeRetorno = {
  confirmando: 'recharge.return.confirming',
  noCerrar: 'recharge.return.dont_close',
  correcto: 'recharge.return.ok',
  redirigiendo: 'recharge.return.redirecting',
  fallo: 'recharge.return.err',
  cancelado: 'recharge.return.cancelled',
  sinIdentificador: 'recharge.return.missing',
  verCartera: 'recharge.return.see_wallet',
};

describe('RetornoDePago', () => {
  const confirmacion = { ejecuta: vi.fn() };

  const monta = (entradas: Record<string, unknown>) =>
    render(RetornoDePago, {
      inputs: { clase: 'pasarela', textos: TEXTOS, esperaMs: 5, ...entradas },
      providers: [provideRouter([]), { provide: ConfirmaRecarga, useValue: confirmacion }],
    });

  beforeEach(() => {
    enEspanol();
    vi.resetAllMocks();
  });

  it('confirma el cobro y avisa de que va a llevar a la cartera', async () => {
    confirmacion.ejecuta.mockResolvedValue(exito(undefined));

    await monta({ idDePago: 'p1' });

    expect(await screen.findByText('Recarga completada')).toBeInTheDocument();
    expect(confirmacion.ejecuta).toHaveBeenCalledWith('p1', 'pasarela');
  });

  /** La confirmación MUEVE dinero: solo puede lanzarse una vez por visita. */
  it('no confirma dos veces aunque la vista se repinte', async () => {
    confirmacion.ejecuta.mockResolvedValue(exito(undefined));

    const vista = await monta({ idDePago: 'p1' });
    await screen.findByText('Recarga completada');
    vista.fixture.detectChanges();
    vista.fixture.detectChanges();

    expect(confirmacion.ejecuta).toHaveBeenCalledTimes(1);
  });

  it('si la pasarela dice que se canceló, no se confirma nada', async () => {
    await monta({ idDePago: 'p1', cancelado: true });

    expect(await screen.findByRole('alert')).toHaveTextContent(/cancel/i);
    expect(confirmacion.ejecuta).not.toHaveBeenCalled();
  });

  it('sin identificador de pago tampoco', async () => {
    await monta({ idDePago: '' });

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(confirmacion.ejecuta).not.toHaveBeenCalled();
  });

  it('enseña el motivo cuando el servidor rechaza la confirmación', async () => {
    confirmacion.ejecuta.mockResolvedValue(fallo(creaError('conflicto', 'Pago no encontrado')));

    await monta({ idDePago: 'p1' });

    expect(await screen.findByRole('alert')).toHaveTextContent('Pago no encontrado');
  });

  /**
   * El salto es diferido para dar tiempo a leer el mensaje; si quien mira se va antes, el temporizador
   * tiene que morir con la pantalla. Si no, se le arrastraba a la cartera desde otra página.
   */
  it('el salto diferido no sobrevive a la pantalla', async () => {
    vi.useFakeTimers();
    confirmacion.ejecuta.mockResolvedValue(exito(undefined));
    try {
      const vista = await monta({ idDePago: 'p1', esperaMs: 1000 });
      await vi.advanceTimersByTimeAsync(1);
      const navega = vi.spyOn(TestBed.inject(Router), 'navigate');
      vista.fixture.destroy();
      await vi.advanceTimersByTimeAsync(2000);

      expect(navega).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
