import { render, screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { CaptchaService } from '@core/security/captcha.service';
import { Captcha } from './captcha';

/** Un doble del resolvedor: la prueba de trabajo real tardaría segundos y necesita el backend. */
function dobleQueDevuelve(resultados: (() => Promise<string>)[]) {
  let llamada = 0;
  return { resuelve: () => resultados[Math.min(llamada++, resultados.length - 1)]() };
}

describe('Captcha', () => {
  it('avisa del testigo en cuanto resuelve el reto', async () => {
    const testigos: (string | null)[] = [];
    await render(Captcha, {
      providers: [
        { provide: CaptchaService, useValue: dobleQueDevuelve([() => Promise.resolve('abc')]) },
      ],
      on: { testigo: (v: string | null) => testigos.push(v) },
    });

    await waitFor(() => expect(testigos).toContain('abc'));
    // Primero se anuncia el hueco: mientras no hay testigo, el formulario no debe darse por válido.
    expect(testigos[0]).toBeNull();
  });

  it('si falla ofrece reintentar en vez de quedarse girando', async () => {
    const usuario = userEvent.setup({ delay: null });
    const testigos: (string | null)[] = [];
    await render(Captcha, {
      providers: [
        {
          provide: CaptchaService,
          useValue: dobleQueDevuelve([
            () => Promise.reject(new Error('sin red')),
            () => Promise.resolve('abc'),
          ]),
        },
      ],
      on: { testigo: (v: string | null) => testigos.push(v) },
    });

    const reintentar = await screen.findByRole('button');
    await usuario.click(reintentar);

    await waitFor(() => expect(testigos).toContain('abc'));
  });
});
