import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { FilaDeCodigo } from './fila-de-codigo';

function enEspanol(): void {
  document.cookie = 'nx036-locale=es';
}

const CODIGO = { id: 'k1', codigo: 'ANA', clics: 12, camino: '/?ref=ANA' };

describe('FilaDeCodigo', () => {
  const avisos = { exito: vi.fn(), error: vi.fn() };

  const monta = () =>
    render(FilaDeCodigo, {
      inputs: { codigo: CODIGO, origen: 'https://nx036.test' },
      providers: [{ provide: AvisosStore, useValue: avisos }],
    });

  beforeEach(() => {
    enEspanol();
    vi.resetAllMocks();
  });

  it('compone el enlace completo con el dominio que se le da', async () => {
    await monta();

    expect(screen.getByText('https://nx036.test/?ref=ANA')).toBeInTheDocument();
    expect(screen.getByText(/12/)).toBeInTheDocument();
  });

  it('copia el enlace y lo confirma', async () => {
    const escribe = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: escribe },
      configurable: true,
    });

    await monta();
    await userEvent.click(screen.getByRole('button', { name: 'Copiar enlace' }));

    expect(escribe).toHaveBeenCalledWith('https://nx036.test/?ref=ANA');
    expect(avisos.exito).toHaveBeenCalled();
  });

  /**
   * El navegador deniega el portapapeles sin TLS, sin permiso o dentro de un marco. Un enlace de
   * referido que no se copia y no lo dice es un afiliado que no puede trabajar.
   */
  it('avisa cuando el navegador deniega el portapapeles', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });

    await monta();
    await userEvent.click(screen.getByRole('button', { name: 'Copiar enlace' }));

    expect(avisos.error).toHaveBeenCalled();
  });

  it('y también cuando la escritura falla a medias', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denegado')) },
      configurable: true,
    });

    await monta();
    await userEvent.click(screen.getByRole('button', { name: 'Copiar enlace' }));

    expect(avisos.error).toHaveBeenCalled();
  });
});
