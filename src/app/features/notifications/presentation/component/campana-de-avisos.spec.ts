import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { BUZON_PORT, BuzonPort } from '../../domain/port/avisos.port';
import { CampanaDeAvisos } from './campana-de-avisos';

describe('CampanaDeAvisos', () => {
  let puerto: BuzonPort;

  beforeEach(() => {
    puerto = {
      lista: vi.fn(),
      sinLeer: vi.fn().mockResolvedValue(exito(3)),
      marcaLeido: vi.fn(),
      marcaTodosLeidos: vi.fn(),
    };
  });

  async function monta() {
    return render(CampanaDeAvisos, {
      providers: [provideRouter([]), { provide: BUZON_PORT, useValue: puerto }],
    });
  }

  it('enseña cuántos quedan sin leer y lleva al buzón', async () => {
    await monta();

    expect(await screen.findByText('3')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/notifications');
  });

  it('con más de nueve enseña «9+», que es lo que cabe en la chapa', async () => {
    vi.mocked(puerto.sinLeer).mockResolvedValue(exito(42));
    await monta();

    expect(await screen.findByText('9+')).toBeInTheDocument();
  });

  it('sin nada sin leer no pinta la chapa', async () => {
    vi.mocked(puerto.sinLeer).mockResolvedValue(exito(0));
    const vista = await monta();
    await vista.fixture.whenStable();

    expect(vista.container.querySelector('.indicator-item')).toBeNull();
  });

  /** Un contador que no llega se enseña como cero: peor sería no pintar la campana. */
  it('si el contador falla, la campana sigue ahí', async () => {
    vi.mocked(puerto.sinLeer).mockResolvedValue(fallo(creaError('sin-conexion')));
    const vista = await monta();
    await vista.fixture.whenStable();

    expect(screen.getByRole('link')).toBeInTheDocument();
    expect(vista.container.querySelector('.indicator-item')).toBeNull();
  });
});
