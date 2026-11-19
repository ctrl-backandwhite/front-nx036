import { render, screen, within } from '@testing-library/angular';
import { COOKIE_IDIOMA } from '@core/preferences/preferencias';
import { FichaDePedido } from '../../../domain/logistica/model/pedido';
import { CanalDelPedido } from './canal-del-pedido';

beforeEach(() => {
  document.cookie = `${COOKIE_IDIOMA}=es; Path=/`;
});

function ficha(parcial: Partial<FichaDePedido> = {}): FichaDePedido {
  return { id: 'p1', numero: 'NX-1', estado: 'PAID', articulos: 1, lineas: [], bultos: [], ...parcial };
}

const EN_REGLA: Partial<FichaDePedido> = {
  transportista: 'YUNEXPRESS',
  nombreDelTransportista: 'YunExpress',
  canalDeEnvio: 'FZZXR',
  nombreDelCanal: 'Linea de ropa YT',
  tipoDeLinea: 'ropa',
  canalAdmisible: true,
};

describe('CanalDelPedido', () => {
  it('enseña el transportista visible, el codigo Y el nombre del canal, y la clase de linea', async () => {
    await render(CanalDelPedido, { inputs: { pedido: ficha(EN_REGLA) } });

    expect(screen.getByTestId('canal-transportista')).toHaveTextContent('YunExpress');
    expect(screen.getByTestId('canal-canal')).toHaveTextContent('FZZXR');
    expect(screen.getByTestId('canal-canal')).toHaveTextContent('Linea de ropa YT');
    expect(screen.getByTestId('canal-linea')).toHaveTextContent('Línea de ropa');
    expect(screen.queryByTestId('canal-problema')).toBeNull();
  });

  /** La fila ya no desaparece justo cuando falta el dato: es cuando más hace falta verla. */
  it('un pedido sin transportista ni canal pinta la seccion igualmente, con el aviso de error', async () => {
    await render(CanalDelPedido, { inputs: { pedido: ficha() } });

    expect(screen.getByTestId('canal-del-pedido')).toBeInTheDocument();
    expect(screen.getByTestId('canal-transportista')).toHaveTextContent('—');
    const aviso = screen.getByRole('alert');
    expect(aviso).toHaveTextContent(/no saldría por su canal/i);
    expect(aviso).toHaveTextContent(/no tiene transportista anotado/i);
  });

  it('con canal inadmisible dice el motivo traducido y el detalle del servidor', async () => {
    await render(CanalDelPedido, {
      inputs: {
        pedido: ficha({
          ...EN_REGLA,
          canalAdmisible: false,
          motivoDelCanal: 'mercancia-no-admitida',
          detalleDelCanal: 'Calzado de piel: canal solo ropa',
        }),
      },
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/no admite la mercancía/i);
    expect(screen.getByTestId('canal-detalle')).toHaveTextContent('Calzado de piel: canal solo ropa');
  });

  it('un motivo nuevo del servidor avisa con un texto generico', async () => {
    await render(CanalDelPedido, {
      inputs: { pedido: ficha({ ...EN_REGLA, canalAdmisible: false }) },
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/no reconoce todavía/i);
  });

  it('una clase de linea desconocida se dice, no se esconde', async () => {
    await render(CanalDelPedido, {
      inputs: { pedido: ficha({ ...EN_REGLA, tipoDeLinea: 'desconocida' }) },
    });

    expect(screen.getByTestId('canal-linea')).toHaveTextContent('Sin clasificar');
  });

  it('sin clase de linea del servidor muestra un guion', async () => {
    await render(CanalDelPedido, {
      inputs: { pedido: ficha({ ...EN_REGLA, tipoDeLinea: undefined }) },
    });

    expect(screen.getByTestId('canal-linea')).toHaveTextContent('—');
  });

  it('tabla de bultos: el canal realmente emitido y si coincide con el cobrado', async () => {
    await render(CanalDelPedido, {
      inputs: {
        pedido: ficha({
          ...EN_REGLA,
          bultos: [
            {
              numero: 1,
              transportista: 'YUNEXPRESS',
              canalEmitido: 'FZZXR',
              numeroDeSeguimiento: 'YT1',
              estado: 'SHIPPED',
              pesoEnGramos: 450,
              coincideConElCanal: true,
            },
            { numero: 2, transportista: 'FOURPX', canalEmitido: 'S1427', numeroDeGuia: 'W2', coincideConElCanal: false },
            { numero: 3 },
          ],
        }),
      },
    });

    const filas = within(screen.getByTestId('canal-bultos')).getAllByRole('row');
    expect(filas).toHaveLength(4);
    expect(filas[1]).toHaveTextContent('FZZXR');
    expect(filas[1]).toHaveTextContent('450 g');
    expect(filas[1]).toHaveTextContent('Sí');
    expect(filas[2]).toHaveTextContent('S1427');
    expect(filas[2]).toHaveTextContent('W2');
    expect(filas[2]).toHaveTextContent('No, otro canal');
    expect(within(filas[3]).getByTestId('canal-coincide')).toHaveTextContent('—');
    expect(screen.getByTestId('canal-bulto-distinto')).toBeInTheDocument();
  });

  it('sin bultos no hay tabla, y con todos coincidentes no hay aviso de bulto distinto', async () => {
    await render(CanalDelPedido, { inputs: { pedido: ficha(EN_REGLA) } });
    expect(screen.queryByTestId('canal-bultos')).toBeNull();
  });

  it('con todos los bultos por el canal cobrado no se avisa', async () => {
    await render(CanalDelPedido, {
      inputs: { pedido: ficha({ ...EN_REGLA, bultos: [{ numero: 1, coincideConElCanal: true }] }) },
    });

    expect(screen.queryByTestId('canal-bulto-distinto')).toBeNull();
  });
});
