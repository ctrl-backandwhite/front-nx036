import { render } from '@testing-library/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CapturaReferido } from '../../application/use-case/captura-referido.use-case';
import { CapturaDeReferido } from './captura-de-referido';

describe('CapturaDeReferido', () => {
  const captura = { apunta: vi.fn(), vincula: vi.fn() };

  const monta = () =>
    render(CapturaDeReferido, {
      providers: [{ provide: CapturaReferido, useValue: captura }],
    });

  beforeEach(() => {
    vi.resetAllMocks();
    captura.vincula.mockResolvedValue(undefined);
  });

  it('no pinta nada: solo trabaja', async () => {
    captura.apunta.mockResolvedValue(null);

    const vista = await monta();

    expect(vista.container.textContent).toBe('');
  });

  it('apunta el clic con la dirección de la visita y ata el testigo', async () => {
    captura.apunta.mockResolvedValue(null);

    await monta();

    expect(captura.apunta).toHaveBeenCalledWith(expect.stringContaining('/'));
    expect(captura.vincula).toHaveBeenCalled();
  });

  /**
   * Si el parámetro se quedara, cualquiera que copiase esa dirección estaría repartiendo el enlace de
   * otro afiliado sin saberlo.
   */
  it('borra el parámetro de la barra de direcciones sin recargar', async () => {
    captura.apunta.mockResolvedValue('/catalog?orden=precio');
    const reemplaza = vi.spyOn(history, 'replaceState');

    await monta();
    // El borrado ocurre después de que la promesa del caso de uso se resuelva.
    await Promise.resolve();
    await Promise.resolve();

    expect(reemplaza).toHaveBeenCalledWith({}, '', '/catalog?orden=precio');
    reemplaza.mockRestore();
  });

  it('sin referido en la dirección no toca el historial', async () => {
    captura.apunta.mockResolvedValue(null);
    const reemplaza = vi.spyOn(history, 'replaceState');

    await monta();
    await Promise.resolve();

    expect(reemplaza).not.toHaveBeenCalled();
    reemplaza.mockRestore();
  });
});
