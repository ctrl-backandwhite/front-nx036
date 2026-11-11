import {
  FichaDePedido,
  accionesPermitidas,
  admiteSeguimiento,
  aniosDisponibles,
  envioElegido,
  cantidadValida,
  faltanDatosDeEnvio,
  importeLegible,
  permite,
  tieneFactura,
  type DireccionDeEnvio,
} from './pedido';

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

describe('años disponibles en el filtro', () => {
  // El filtrado por fecha vive ahora en el servidor (ver el backend); el selector solo necesita ofrecer
  // los años elegibles, generados hasta el año en curso y NO derivados de la página cargada.
  it('van del año en curso hacia atrás hasta el primer año con actividad', () => {
    expect(aniosDisponibles(2026)).toEqual(['2026', '2025', '2024']);
  });

  it('nunca quedan vacíos: si el año en curso es anterior al inicio, al menos sale el inicio', () => {
    expect(aniosDisponibles(2023)).toEqual(['2024']);
  });

  it('admite adelantar el primer año con actividad', () => {
    expect(aniosDisponibles(2027, 2026)).toEqual(['2027', '2026']);
  });
});

describe('el transportista cobrado de un pedido', () => {
  function ficha(parcial: Partial<FichaDePedido> = {}): FichaDePedido {
    return {
      id: 'x',
      numero: 'NX-1',
      estado: 'FORWARDED',
      articulos: 1,
      lineas: [],
      ...parcial,
    };
  }

  /**
   * Es el dato que explica por qué un pedido salió por donde salió. Antes solo se veía el
   * transportista de la GUÍA ya emitida, que es otra cosa: con dos transportistas hace falta saber
   * cuál se cobró para poder ver que salió por el que no tocaba.
   */
  it('junta el transportista con el nombre del canal', () => {
    expect(
      envioElegido(ficha({ transportista: 'FOURPX', nombreDelCanal: 'LYT GH' })),
    ).toBe('FOURPX · LYT GH');
  });

  it('sin nombre de canal usa el código, que es lo que se puede buscar en el panel del carrier', () => {
    expect(envioElegido(ficha({ transportista: 'FOURPX', canalDeEnvio: 'QC' }))).toBe('FOURPX · QC');
  });

  it('con transportista y sin canal enseña solo el transportista', () => {
    expect(envioElegido(ficha({ transportista: 'YUNEXPRESS' }))).toBe('YUNEXPRESS');
  });

  /**
   * Los pedidos anteriores a que hubiera más de un transportista no lo llevan, y ahí NO se enseña un
   * hueco: se omite la fila entera, porque entonces no había nada que elegir.
   */
  it('sin transportista no hay nada que enseñar', () => {
    expect(envioElegido(ficha())).toBeUndefined();
    expect(envioElegido(ficha({ nombreDelCanal: 'LYT GH' }))).toBeUndefined();
  });
});
