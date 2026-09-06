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
});
