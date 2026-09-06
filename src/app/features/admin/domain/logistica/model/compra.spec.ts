import {
  agrupaPorPedido,
  enRiesgo,
  nombreDeHoja,
  pasoQueToca,
  pedidosBloqueados,
  puedeReexportarse,
  type CompraAProveedor,
} from './compra';

function compra(parcial: Partial<CompraAProveedor> = {}): CompraAProveedor {
  return {
    id: 'c1',
    pedidoId: 'p1',
    estado: 'PENDING',
    lineas: [],
    ...parcial,
  };
}

describe('qué paso toca en una compra', () => {
  it.each([
    ['PENDING', 'bought'],
    ['PURCHASED', 'shipped'],
    ['IN_TRANSIT', 'received'],
    ['AT_WAREHOUSE', 'packed'],
  ] as const)('desde %s toca %s', (estado, paso) => {
    expect(pasoQueToca(estado)).toBe(paso);
  });

  it('una compra ya re-empaquetada o anulada no tiene nada pendiente', () => {
    expect(pasoQueToca('PACKED')).toBeNull();
    expect(pasoQueToca('CANCELLED')).toBeNull();
  });
});

describe('compras en riesgo de destrucción', () => {
  it('avisa a partir de los veinte días en el almacén', () => {
    const nueva = compra({ id: 'a', diasEnAlmacen: 5, estado: 'AT_WAREHOUSE' });
    const vieja = compra({ id: 'b', diasEnAlmacen: 22, estado: 'AT_WAREHOUSE' });
    expect(enRiesgo([nueva, vieja]).map((c) => c.id)).toEqual(['b']);
  });

  /** Una vez re-empaquetada el almacén la ha tomado por su cuenta: ya no corre peligro. */
  it('una compra ya re-empaquetada no está en riesgo por muchos días que lleve', () => {
    const empaquetada = compra({ diasEnAlmacen: 40, estado: 'PACKED' });
    expect(enRiesgo([empaquetada])).toEqual([]);
  });

  it('sin días registrados no se cuenta como riesgo', () => {
    expect(enRiesgo([compra({ estado: 'AT_WAREHOUSE' })])).toEqual([]);
  });
});

describe('agrupación por pedido', () => {
  it('junta las compras del mismo pedido conservando el orden de llegada', () => {
    const grupos = agrupaPorPedido([
      compra({ id: 'a', numeroDePedido: 'NX-1' }),
      compra({ id: 'b', numeroDePedido: 'NX-2' }),
      compra({ id: 'c', numeroDePedido: 'NX-1' }),
    ]);
    expect(grupos.map((g) => g.pedido)).toEqual(['NX-1', 'NX-2']);
    expect(grupos[0].compras.map((c) => c.id)).toEqual(['a', 'c']);
  });

  /** Mejor una tarjeta suelta que meterlas todas juntas bajo una cabecera vacía. */
  it('sin número de pedido se agrupa por su propio identificador', () => {
    const grupos = agrupaPorPedido([compra({ id: 'huerfana' })]);
    expect(grupos[0].pedido).toBe('huerfana');
  });

  it('sin compras no hay grupos', () => {
    expect(agrupaPorPedido([])).toEqual([]);
  });
});

describe('pedidos bloqueados para exportar', () => {
  /**
   * Se cuentan PEDIDOS, no incidencias: decir «2 pedidos» cuando es uno con dos fallos hace buscar un
   * pedido que no existe.
   */
  it('un pedido con dos motivos cuenta una sola vez', () => {
    const incidencias = [
      { pedidoId: 'p1', numeroDePedido: 'NX-1', motivo: 'falta peso' },
      { pedidoId: 'p1', numeroDePedido: 'NX-1', motivo: 'falta partida' },
      { pedidoId: 'p2', numeroDePedido: 'NX-2', motivo: 'sin guía' },
    ];
    expect(pedidosBloqueados(incidencias)).toBe(2);
  });

  it('sin incidencias no hay bloqueados', () => {
    expect(pedidosBloqueados([])).toBe(0);
  });
});

describe('re-exportación', () => {
  it('se ofrece a lo ya exportado que aún no está re-empaquetado', () => {
    expect(puedeReexportarse(compra({ exportadoEl: '2026-09-01', estado: 'AT_WAREHOUSE' }))).toBe(
      true,
    );
  });

  /** La validación la rechazaría por duplicada: ofrecerlo sería prometer algo que no puede pasar. */
  it('NO se ofrece sobre una compra ya re-empaquetada', () => {
    expect(puedeReexportarse(compra({ exportadoEl: '2026-09-01', estado: 'PACKED' }))).toBe(false);
  });

  it('no se ofrece sobre algo que nunca se exportó', () => {
    expect(puedeReexportarse(compra({ estado: 'AT_WAREHOUSE' }))).toBe(false);
  });
});

describe('nombre del fichero de re-empaquetado', () => {
  it('lleva marca de tiempo ordenable, para saber cuál fue la última descarga', () => {
    expect(nombreDeHoja(new Date(2026, 8, 6, 7, 5))).toBe(
      'yunfulfillment-packorder_2026-09-06_07-05.xls',
    );
  });
});
