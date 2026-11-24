import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen, waitFor, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { IncidenciaDeEnvio } from '../../../domain/logistica/model/incidencia-de-envio';
import { INCIDENCIAS_DE_ENVIO_PORT } from '../../../domain/logistica/port/incidencias-de-envio.port';
import {
  BuscaIncidencias,
  ResuelveIncidencia,
} from '../../../application/logistica/use-case/gestiona-incidencias.use-case';
import { IncidenciasDeEnvioPage } from './incidencias-de-envio.page';

vi.setConfig({ testTimeout: 30_000 });

function incidencia(parcial: Partial<IncidenciaDeEnvio> = {}): IncidenciaDeEnvio {
  return {
    id: 'i1',
    pedidoId: 'o1',
    numeroDePedido: 'NX-1',
    secuenciaDelBulto: 2,
    transportista: 'FOURPX',
    numeroDeSeguimiento: 'FPX1',
    codigo: 'FPX_Y',
    causa: 'Dirección incompleta',
    culpaNuestra: true,
    estado: 'OPEN',
    abiertaEl: '2026-11-24T10:00:00Z',
    ...parcial,
  };
}

describe('IncidenciasDeEnvioPage', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  async function monta(filas: readonly IncidenciaDeEnvio[] = [incidencia()], paginas = 1) {
    const puerto = {
      busca: vi.fn().mockResolvedValue(exito({ incidencias: filas, total: filas.length, paginas, pagina: 0 })),
      resuelve: vi.fn().mockResolvedValue(exito(undefined)),
    };
    const vista = await render(IncidenciasDeEnvioPage, {
      providers: [
        provideRouter([]),
        BuscaIncidencias,
        ResuelveIncidencia,
        { provide: INCIDENCIAS_DE_ENVIO_PORT, useValue: puerto },
      ],
    });
    await waitFor(() => expect(puerto.busca).toHaveBeenCalled());
    vista.fixture.detectChanges();
    return { puerto, vista };
  }

  it('por defecto pide al servidor las abiertas, sin filtrar por transportista', async () => {
    const { puerto } = await monta();

    expect(puerto.busca).toHaveBeenCalledWith({
      transportista: undefined,
      estado: 'OPEN',
      pagina: 0,
      tamano: 25,
    });
  });

  it('pinta la fila con pedido enlazado a su ficha, causa y responsable', async () => {
    await monta();

    const enlace = await screen.findByRole('link', { name: 'NX-1' });
    expect(enlace).toHaveAttribute('href', '/admin/orders/o1');
    expect(screen.getByText('Dirección incompleta')).toBeInTheDocument();
    expect(screen.getByText('Nuestra')).toBeInTheDocument();
    expect(screen.getByText('FPX_Y')).toBeInTheDocument();
  });

  it('cambiar el transportista vuelve a pedir al SERVIDOR, no recorta en el navegador', async () => {
    const { puerto } = await monta();

    await userEvent.selectOptions(screen.getByLabelText('Transportista'), 'FOURPX');

    await waitFor(() =>
      expect(puerto.busca).toHaveBeenLastCalledWith({
        transportista: 'FOURPX',
        estado: 'OPEN',
        pagina: 0,
        tamano: 25,
      }),
    );
  });

  it('cambiar el estado a «Todas» no manda estado', async () => {
    const { puerto } = await monta();

    await userEvent.selectOptions(screen.getByLabelText('Estado'), '');

    await waitFor(() =>
      expect(puerto.busca).toHaveBeenLastCalledWith(
        expect.objectContaining({ estado: undefined }),
      ),
    );
  });

  it('paginar pide la página siguiente, y cambiar un filtro vuelve a la primera', async () => {
    const { puerto } = await monta([incidencia()], 3);

    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await waitFor(() =>
      expect(puerto.busca).toHaveBeenLastCalledWith(expect.objectContaining({ pagina: 1 })),
    );

    await userEvent.selectOptions(screen.getByLabelText('Transportista'), 'YUNEXPRESS');
    await waitFor(() =>
      expect(puerto.busca).toHaveBeenLastCalledWith(
        expect.objectContaining({ transportista: 'YUNEXPRESS', pagina: 0 }),
      ),
    );
  });

  it('sin resultados lo dice', async () => {
    await monta([]);

    expect(await screen.findByText('No hay incidencias con este filtro.')).toBeInTheDocument();
  });

  it('si la carga falla lo dice y avisa', async () => {
    const puerto = {
      busca: vi.fn().mockResolvedValue(fallo(creaError('error-del-servidor', 'Caído'))),
      resuelve: vi.fn(),
    };
    await render(IncidenciasDeEnvioPage, {
      providers: [
        provideRouter([]),
        BuscaIncidencias,
        ResuelveIncidencia,
        { provide: INCIDENCIAS_DE_ENVIO_PORT, useValue: puerto },
      ],
    });

    expect(await screen.findByText('No se pudieron cargar las incidencias.')).toBeInTheDocument();
    expect(TestBed.inject(AvisosStore).avisos().map((a) => a.mensaje)).toContain('Caído');
  });

  it('una incidencia resuelta enseña quién y la nota, y no ofrece resolver', async () => {
    await monta([
      incidencia({
        estado: 'RESOLVED',
        resueltaPor: 'ana',
        resueltaEl: '2026-11-25T09:00:00Z',
        nota: 'Reenviado con la dirección buena',
      }),
    ]);

    const fila = (await screen.findByRole('link', { name: 'NX-1' })).closest('tr')!;
    expect(within(fila).getByText(/ana/)).toBeInTheDocument();
    expect(within(fila).getByText('Reenviado con la dirección buena')).toBeInTheDocument();
    expect(within(fila).queryByRole('button', { name: 'Resolver' })).toBeNull();
  });

  describe('resolver', () => {
    it('pide la nota en el diálogo propio y manda la nota; después recarga', async () => {
      const { puerto } = await monta();
      vi.spyOn(TestBed.inject(DialogoStore), 'formulario').mockResolvedValue({
        nota: 'Dirección corregida',
      });
      const llamadasAntes = puerto.busca.mock.calls.length;

      await userEvent.click(await screen.findByRole('button', { name: 'Resolver' }));

      await waitFor(() => expect(puerto.resuelve).toHaveBeenCalledWith('i1', 'Dirección corregida'));
      await waitFor(() => expect(puerto.busca.mock.calls.length).toBe(llamadasAntes + 1));
      expect(TestBed.inject(AvisosStore).avisos().map((a) => a.mensaje)).toContain(
        'Incidencia resuelta',
      );
    });

    it('la nota es obligatoria en el diálogo', async () => {
      await monta();
      const formulario = vi.spyOn(TestBed.inject(DialogoStore), 'formulario').mockResolvedValue(null);

      await userEvent.click(await screen.findByRole('button', { name: 'Resolver' }));

      const peticion = formulario.mock.calls[0][0];
      expect(peticion.campos?.[0]).toMatchObject({ nombre: 'nota', obligatorio: true });
    });

    it('si se cancela el diálogo no se resuelve nada', async () => {
      const { puerto } = await monta();
      vi.spyOn(TestBed.inject(DialogoStore), 'formulario').mockResolvedValue(null);

      await userEvent.click(await screen.findByRole('button', { name: 'Resolver' }));

      expect(puerto.resuelve).not.toHaveBeenCalled();
    });

    it('si el servidor rechaza, lo cuenta y no recarga', async () => {
      const { puerto } = await monta();
      vi.spyOn(TestBed.inject(DialogoStore), 'formulario').mockResolvedValue({ nota: 'x' });
      puerto.resuelve.mockResolvedValue(fallo(creaError('conflicto', 'Ya estaba resuelta')));
      const antes = puerto.busca.mock.calls.length;

      await userEvent.click(await screen.findByRole('button', { name: 'Resolver' }));

      await waitFor(() =>
        expect(TestBed.inject(AvisosStore).avisos().map((a) => a.mensaje)).toContain(
          'Ya estaba resuelta',
        ),
      );
      expect(puerto.busca.mock.calls.length).toBe(antes);
    });
  });
});
