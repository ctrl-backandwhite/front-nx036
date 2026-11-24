import { render, screen } from '@testing-library/angular';
import { beforeEach, describe, expect, it } from 'vitest';
import { Seguimiento } from '../../domain/model/seguimiento';
import { LineaDeTiempoDeSeguimiento } from './linea-de-tiempo-de-seguimiento';

const seguimiento = (parcial: Partial<Seguimiento> = {}): Seguimiento => ({
  hitos: [],
  bultos: [],
  ...parcial,
});

/**
 * Las pruebas se corren en español: el idioma sale de la cookie de preferencias y, sin ella, el
 * navegador de las pruebas pide inglés. Fijarla aquí deja las comprobaciones sobre el diccionario real
 * en vez de un doble que las volvería ciegas a una clave que falte.
 */
function enEspanol(): void {
  document.cookie = 'nx036-locale=es';
}

describe('LineaDeTiempoDeSeguimiento', () => {
  beforeEach(() => enEspanol());

  /** Una tarjeta con el título y el vacío debajo parece un fallo de carga. */
  it('sin nada que contar no pinta la sección', async () => {
    await render(LineaDeTiempoDeSeguimiento, { inputs: { seguimiento: seguimiento() } });

    expect(screen.queryByText('Seguimiento del envío')).toBeNull();
  });

  it('sin seguimiento tampoco', async () => {
    await render(LineaDeTiempoDeSeguimiento, { inputs: { seguimiento: null } });

    expect(screen.queryByText('Seguimiento del envío')).toBeNull();
  });

  it('con guía y sin pasos enseña el transportista y avisa de que no hay eventos', async () => {
    await render(LineaDeTiempoDeSeguimiento, {
      inputs: { seguimiento: seguimiento({ numeroDeSeguimiento: 'LP123', transportista: 'YunExpress' }) },
    });

    expect(screen.getByText(/YunExpress · LP123/)).toBeInTheDocument();
    expect(screen.getByText('Aún no hay eventos de seguimiento.')).toBeInTheDocument();
  });

  it('sin transportista usa el nombre genérico en vez de dejar el hueco', async () => {
    await render(LineaDeTiempoDeSeguimiento, {
      inputs: { seguimiento: seguimiento({ numeroDeSeguimiento: 'LP123' }) },
    });

    expect(screen.getByText(/Envío estándar · LP123/)).toBeInTheDocument();
  });

  it('pinta los pasos con su ubicación traducida a nombre de país', async () => {
    await render(LineaDeTiempoDeSeguimiento, {
      inputs: {
        seguimiento: seguimiento({
          numeroDeSeguimiento: 'LP123',
          hitos: [{ estado: 'SHIPPED', descripcion: 'En tránsito', ubicacion: 'ES' }],
        }),
      },
    });

    expect(screen.getByText('En tránsito')).toBeInTheDocument();
    expect(screen.getByText(/España/)).toBeInTheDocument();
  });

  /**
   * Con varios paquetes cada uno va por separado con su guía: mezclarlos haría imposible saber qué le
   * pasa a cada bulto.
   */
  it('con varios bultos enseña cada uno con su numeración y su contenido', async () => {
    await render(LineaDeTiempoDeSeguimiento, {
      inputs: {
        seguimiento: seguimiento({
          bultos: [
            {
              secuencia: 1,
              pesoGramos: 1500,
              numeroDeSeguimiento: 'LP1',
              hitos: [{ estado: 'SHIPPED', descripcion: 'Salida del almacén' }],
              contenido: [{ titulo: 'Gorro', cantidad: 2 }],
            },
            { secuencia: 2, pesoGramos: 0, hitos: [], contenido: [] },
          ],
        }),
      },
    });

    expect(screen.getByText(/Paquete 1\/2/)).toBeInTheDocument();
    expect(screen.getByText(/1\.50 kg/)).toBeInTheDocument();
    expect(screen.getByText('Gorro')).toBeInTheDocument();
    expect(screen.getByText('Salida del almacén')).toBeInTheDocument();
    expect(screen.getByText('Aún no hay eventos de seguimiento.')).toBeInTheDocument();
  });

  describe('fase, transportista y enlace', () => {
    it('destaca la fase actual con su rótulo traducido', async () => {
      await render(LineaDeTiempoDeSeguimiento, {
        inputs: {
          seguimiento: seguimiento({
            numeroDeSeguimiento: 'LP1',
            fase: 'EN_ADUANA',
            hitos: [{ estado: 'SHIPPED', descripcion: 'Despacho' }],
          }),
        },
      });

      expect(screen.getByText('En aduana')).toBeInTheDocument();
    });

    it('sin fase no pinta pastilla alguna: el pedido se ve como hasta ahora', async () => {
      const { container } = await render(LineaDeTiempoDeSeguimiento, {
        inputs: { seguimiento: seguimiento({ numeroDeSeguimiento: 'LP1' }) },
      });

      expect(container.querySelector('[data-fase-del-envio]')).toBeNull();
      expect(container.querySelector('[data-enlace-de-seguimiento]')).toBeNull();
      expect(container.querySelector('[data-impuestos-al-recibir]')).toBeNull();
    });

    it('el enlace de seguimiento se abre en pestaña nueva con noopener', async () => {
      await render(LineaDeTiempoDeSeguimiento, {
        inputs: {
          seguimiento: seguimiento({
            numeroDeSeguimiento: 'LP1',
            transportista: '4PX',
            urlDeSeguimiento: 'https://track.example/LP1',
          }),
        },
      });

      const enlace = screen.getByRole('link', { name: 'Seguir en la web del transportista' });
      expect(enlace).toHaveAttribute('href', 'https://track.example/LP1');
      expect(enlace).toHaveAttribute('target', '_blank');
      expect(enlace).toHaveAttribute('rel', 'noopener');
    });

    it('un enlace que no es http(s) no se pinta', async () => {
      await render(LineaDeTiempoDeSeguimiento, {
        inputs: {
          seguimiento: seguimiento({
            numeroDeSeguimiento: 'LP1',
            urlDeSeguimiento: 'javascript:alert(1)',
          }),
        },
      });

      expect(screen.queryByRole('link', { name: 'Seguir en la web del transportista' })).toBeNull();
    });

    it('avisa de que los impuestos se pagan al recibir cuando el envío va DDU', async () => {
      await render(LineaDeTiempoDeSeguimiento, {
        inputs: {
          seguimiento: seguimiento({ numeroDeSeguimiento: 'LP1', impuestosAlRecibir: true }),
        },
      });

      expect(screen.getByRole('note')).toHaveTextContent(/impuestos de importación.*al recibir/i);
    });

    it('un hito sin descripción se cuenta con la fase, no como viñeta vacía', async () => {
      await render(LineaDeTiempoDeSeguimiento, {
        inputs: {
          seguimiento: seguimiento({
            numeroDeSeguimiento: 'LP1',
            hitos: [{ estado: 'SHIPPED', fase: 'EN_REPARTO' }],
          }),
        },
      });

      expect(screen.getByText('En reparto')).toBeInTheDocument();
    });

    it('sin descripción ni fase se cuenta con el estado del pedido', async () => {
      await render(LineaDeTiempoDeSeguimiento, {
        inputs: {
          seguimiento: seguimiento({
            numeroDeSeguimiento: 'LP1',
            hitos: [{ estado: 'DELIVERED', descripcion: '  ' }],
          }),
        },
      });

      expect(screen.getByText('Entregado')).toBeInTheDocument();
    });

    it('sin traducción para el estado enseña el estado tal cual, nunca una clave', async () => {
      await render(LineaDeTiempoDeSeguimiento, {
        inputs: {
          seguimiento: seguimiento({
            numeroDeSeguimiento: 'LP1',
            hitos: [{ estado: 'RARO' }],
          }),
        },
      });

      expect(screen.getByText('RARO')).toBeInTheDocument();
      expect(screen.queryByText(/orders\.status/)).toBeNull();
    });

    it('con varios bultos enseña el transportista y el enlace de cada uno, y la prueba de entrega', async () => {
      await render(LineaDeTiempoDeSeguimiento, {
        inputs: {
          seguimiento: seguimiento({
            transportista: '4PX',
            bultos: [
              {
                secuencia: 1,
                transportista: '4PX',
                numeroDeSeguimiento: 'LP1',
                pesoGramos: 500,
                fase: 'ENTREGADO',
                urlDeSeguimiento: 'https://track.example/LP1',
                pruebaDeEntregaUrl: 'https://epod.example/LP1',
                hitos: [],
                contenido: [],
              },
              {
                secuencia: 2,
                pesoGramos: 500,
                fase: 'INCIDENCIA',
                hitos: [],
                contenido: [],
              },
            ],
          }),
        },
      });

      expect(screen.getByRole('link', { name: 'Ver la prueba de entrega' })).toHaveAttribute(
        'href',
        'https://epod.example/LP1',
      );
      expect(screen.getByRole('link', { name: 'Ver la prueba de entrega' })).toHaveAttribute(
        'rel',
        'noopener',
      );
      expect(screen.getAllByRole('link', { name: 'Seguir en la web del transportista' })).toHaveLength(1);
      expect(screen.getByText('Entregado')).toBeInTheDocument();
      expect(screen.getByText('Incidencia en el envío')).toBeInTheDocument();
      expect(screen.getAllByText('4PX', { selector: 'strong' })).toHaveLength(2);
    });
  });
});
