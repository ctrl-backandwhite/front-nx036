import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { OpcionDeEnvio } from '../../domain/model/cotizacion-de-envio';
import { OpcionesDeEnvio } from './opciones-de-envio';

function opcion(codigo: string, importe: number, diasMaximos = 15): OpcionDeEnvio {
  return {
    codigo,
    importeParaComparar: importe,
    importeFormateado: `${(importe / 100).toFixed(2)} €`,
    transportista: 'YunExpress',
    diasMinimos: 5,
    diasMaximos,
  };
}

async function monta(opciones: OpcionDeEnvio[], seleccionada?: string) {
  return render(OpcionesDeEnvio, { inputs: { opciones, seleccionada } });
}

describe('OpcionesDeEnvio', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('es un grupo de opciones con nombre, no una lista suelta de botones', async () => {
    await monta([opcion('A', 705), opcion('B', 900)]);

    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
  });

  /** «FZZXR» no le dice nada a nadie: se elige por plazo y precio. */
  it('NO enseña el código del canal del transportista', async () => {
    await monta([opcion('FZZXR', 705), opcion('OTRO', 900)]);

    expect(screen.queryByText(/FZZXR/)).toBeNull();
    expect(screen.getAllByText(/YunExpress/).length).toBe(2);
  });

  it('marca la más barata y la más rápida con su insignia', async () => {
    await monta([opcion('BARATA', 705, 20), opcion('RAPIDA', 1500, 5)]);

    expect(screen.getByText(/más barata|barata|cheapest/i)).toBeInTheDocument();
    expect(screen.getByText(/más rápida|rápida|fastest/i)).toBeInTheDocument();
  });

  it('al elegir avisa con el código, que es lo que viaja de vuelta', async () => {
    const vista = await monta([opcion('A', 705), opcion('B', 900)]);
    const elegido: string[] = [];
    vista.fixture.componentInstance.elige.subscribe((c: string) => elegido.push(c));

    await userEvent.click(screen.getAllByRole('radio')[1]);

    expect(elegido).toEqual(['B']);
  });

  /** Cinco tarjetas abiertas empujan el botón de pagar fuera de la pantalla en un móvil. */
  it('enseña tres y ofrece desplegar el resto diciendo cuántas faltan', async () => {
    const vista = await monta([
      opcion('A', 700),
      opcion('B', 800),
      opcion('C', 900),
      opcion('D', 1000),
      opcion('E', 1100),
    ]);

    expect(screen.getAllByRole('radio')).toHaveLength(3);

    await userEvent.click(screen.getByRole('button'));
    vista.fixture.detectChanges();

    expect(screen.getAllByRole('radio')).toHaveLength(5);
  });

  /**
   * El servidor recotiza al confirmar y puede quedarse con un canal que no está entre los tres primeros:
   * plegado, la lista no enseñaría ninguna opción marcada.
   */
  it('si el canal cotizado está plegado, la lista nace abierta y sin botón para plegarla', async () => {
    await monta(
      [opcion('A', 700), opcion('B', 800), opcion('C', 900), opcion('D', 1000)],
      'D',
    );

    expect(screen.getAllByRole('radio')).toHaveLength(4);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('con una sola opción no hay insignias ni comparación', async () => {
    await monta([opcion('A', 705)]);

    expect(screen.queryByText(/más barata|cheapest/i)).toBeNull();
    expect(screen.getAllByRole('radio')).toHaveLength(1);
  });

  it('sin transportista la fila se pinta igual, sin un hueco raro', async () => {
    await monta([{ ...opcion('A', 705), transportista: undefined }]);

    expect(screen.queryByText(/YunExpress/)).toBeNull();
    expect(screen.getByRole('radio')).toBeInTheDocument();
  });
});
