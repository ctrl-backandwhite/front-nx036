import {
  accionesPermitidas,
  admiteSeguimiento,
  aniosDe,
  cantidadValida,
  filtraPorFecha,
  filtroDeFechasVacio,
  faltanDatosDeEnvio,
  importeLegible,
  permite,
  tieneFactura,
  type DireccionDeEnvio,
  type Pedido,
} from './pedido';

function pedido(parcial: Partial<Pedido> = {}): Pedido {
  return {
    id: 'p1',
    numero: 'NX-1',
    estado: 'PAID',
    articulos: 1,
    ...parcial,
  };
}

function direccion(parcial: Partial<DireccionDeEnvio> = {}): DireccionDeEnvio {
  return {
    nombreCompleto: 'Juan Pérez',
    linea1: 'C/ Mayor 1',
    ciudad: 'Madrid',
    pais: 'ES',
    ...parcial,
  };
}

describe('transiciones de un pedido', () => {
  it('un pedido cobrado se puede despachar o cancelar, pero no entregar', () => {
    expect(accionesPermitidas('PAID')).toEqual(['forward', 'cancel']);
    expect(permite('PAID', 'deliver')).toBe(false);
  });

  it('solo un pedido entregado se puede reembolsar: antes no se ha cobrado del todo', () => {
    expect(permite('DELIVERED', 'refund')).toBe(true);
    expect(permite('SHIPPED', 'refund')).toBe(false);
  });

  it('un estado final no admite nada', () => {
    expect(accionesPermitidas('CANCELLED')).toEqual([]);
    expect(accionesPermitidas('REFUNDED')).toEqual([]);
  });

  /**
   * Es la protección importante: si el backend inventa un estado nuevo, la pantalla no puede ofrecer
   * las cinco acciones «por si acaso».
   */
  it('un estado desconocido no permite NINGUNA acción', () => {
    expect(accionesPermitidas('INVENTADO')).toEqual([]);
    expect(permite('INVENTADO', 'cancel')).toBe(false);
  });
});

describe('importe que se pinta', () => {
  it('manda el texto del backend cuando llega', () => {
    expect(importeLegible('9,54 €', 953, 'EUR')).toBe('9,54 €');
  });

  it('sin texto se escribe la cantidad en SU moneda, sin convertirla', () => {
    expect(importeLegible(undefined, 953, 'EUR')).toBe('9.53 EUR');
  });

  it('sin cantidad no se inventa un cero', () => {
    expect(importeLegible(undefined, undefined, 'EUR')).toBeUndefined();
  });

  it('sin moneda se escribe solo el número, sin espacio colgando', () => {
    expect(importeLegible(undefined, 1000, undefined)).toBe('10.00');
  });
});

describe('cantidad de una línea', () => {
  it('nunca baja de una unidad', () => {
    expect(cantidadValida(0)).toBe(1);
    expect(cantidadValida(-5)).toBe(1);
  });

  it('nunca es fraccionaria: el almacén no sabe preparar media prenda', () => {
    expect(cantidadValida(1.5)).toBe(1);
    expect(cantidadValida(3.9)).toBe(3);
  });

  it('un valor que no es número cae a una unidad', () => {
    expect(cantidadValida(Number.NaN)).toBe(1);
  });
});

describe('datos mínimos de envío', () => {
  it('con nombre, calle, ciudad y país está completo', () => {
    expect(faltanDatosDeEnvio(direccion())).toBe(false);
  });

  it.each([
    ['nombreCompleto', { nombreCompleto: '  ' }],
    ['linea1', { linea1: '' }],
    ['ciudad', { ciudad: '   ' }],
    ['pais', { pais: '' }],
  ])('falta %s', (_campo, hueco) => {
    expect(faltanDatosDeEnvio(direccion(hueco))).toBe(true);
  });
});

describe('qué se ofrece según el estado', () => {
  it('no hay factura hasta que el pedido deja de ser una intención', () => {
    expect(tieneFactura('PENDING')).toBe(false);
    expect(tieneFactura('AWAITING_PAYMENT')).toBe(false);
    expect(tieneFactura('CANCELLED')).toBe(false);
    expect(tieneFactura('PAID')).toBe(true);
  });

  it('el seguimiento solo tiene sentido desde que sale hacia el transportista', () => {
    expect(admiteSeguimiento('PAID')).toBe(false);
    expect(admiteSeguimiento('FORWARDED')).toBe(true);
    expect(admiteSeguimiento('DELIVERED')).toBe(true);
  });
});

describe('filtro de fechas', () => {
  const marzo = pedido({ id: 'a', realizadoEl: '2026-03-15T10:00:00Z' });
  const abril = pedido({ id: 'b', realizadoEl: '2026-04-02T10:00:00Z' });
  const anterior = pedido({ id: 'c', realizadoEl: '2025-03-15T10:00:00Z' });
  const sinFecha = pedido({ id: 'd' });
  const todos = [marzo, abril, anterior, sinFecha];

  it('sin ningún criterio no recorta nada', () => {
    expect(filtroDeFechasVacio({})).toBe(true);
    expect(filtraPorFecha(todos, {})).toBe(todos);
  });

  it('recorta por año', () => {
    expect(filtraPorFecha(todos, { anio: '2026' }).map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('recorta por mes y por día', () => {
    expect(filtraPorFecha(todos, { mes: '3' }).map((p) => p.id)).toEqual(['a', 'c']);
    expect(filtraPorFecha(todos, { dia: '2' }).map((p) => p.id)).toEqual(['b']);
  });

  /** El «hasta» incluye el día entero: sin eso, filtrar «hasta el 15» dejaba fuera el propio día 15. */
  it('el límite superior incluye el día completo', () => {
    expect(filtraPorFecha(todos, { hasta: '2026-03-15' }).map((p) => p.id)).toEqual(['a', 'c']);
  });

  it('el límite inferior deja fuera lo anterior', () => {
    expect(filtraPorFecha(todos, { desde: '2026-04-01' }).map((p) => p.id)).toEqual(['b']);
  });

  it('un pedido SIN fecha se descarta cuando hay filtro: no se puede afirmar que caiga dentro', () => {
    expect(filtraPorFecha(todos, { anio: '2026' }).map((p) => p.id)).not.toContain('d');
  });

  it('una fecha ilegible se descarta en vez de tumbar el listado', () => {
    const roto = pedido({ id: 'e', realizadoEl: 'no-es-una-fecha' });
    expect(filtraPorFecha([roto], { anio: '2026' })).toEqual([]);
  });
});

describe('años presentes en el listado', () => {
  it('sin repetir y del más reciente al más antiguo', () => {
    const filas = [
      pedido({ id: 'a', realizadoEl: '2025-01-01T00:00:00Z' }),
      pedido({ id: 'b', realizadoEl: '2026-01-01T00:00:00Z' }),
      pedido({ id: 'c', realizadoEl: '2026-06-01T00:00:00Z' }),
    ];
    expect(aniosDe(filas)).toEqual(['2026', '2025']);
  });

  it('ignora los que no traen fecha y las fechas ilegibles', () => {
    expect(aniosDe([pedido(), pedido({ realizadoEl: 'x' })])).toEqual([]);
  });
});
