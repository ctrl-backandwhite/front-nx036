import {
  LineaDeCarrito,
  aseguraLinea,
  claveDeLinea,
  deduplica,
  esLaMismaLinea,
  insertaOFusiona,
  normalizaVariante,
  precioCongelado,
  sinLinea,
  skuVisible,
  unidadesTotales,
} from './linea-de-carrito';

function linea(parcial: Partial<LineaDeCarrito> = {}): LineaDeCarrito {
  return {
    productId: 'p1',
    slug: 'gorro-de-lana',
    titulo: 'Gorro de lana',
    precioUnitarioOrigen: 10,
    divisaDeOrigen: 'CNY',
    cantidad: 1,
    ...parcial,
  };
}

describe('normalizaVariante', () => {
  /** «Sin variante» se escribió de tres formas y comparar sin normalizar duplicaba la línea. */
  it('trata ausente, nula y cadena vacía como lo mismo', () => {
    expect(normalizaVariante(undefined)).toBeNull();
    expect(normalizaVariante(null)).toBeNull();
    expect(normalizaVariante('')).toBeNull();
    expect(normalizaVariante('v1')).toBe('v1');
  });
});

describe('esLaMismaLinea', () => {
  it('la cadena vacía y la ausencia son la misma línea', () => {
    expect(esLaMismaLinea(linea({ variantId: '' }), { productId: 'p1' })).toBe(true);
  });

  it('distingue variantes distintas del mismo producto', () => {
    expect(esLaMismaLinea(linea({ variantId: 'v1' }), { productId: 'p1', variantId: 'v2' })).toBe(
      false,
    );
  });
});

describe('precioCongelado', () => {
  it('prefiere el precio que se le enseñó a quien compra, con SU divisa', () => {
    expect(
      precioCongelado(linea({ precioUnitarioMostrado: 14.9, divisaMostrada: 'EUR' })),
    ).toEqual({ importe: 14.9, divisa: 'EUR' });
  });

  /** El fallo real: 117 CNY pintados como «117,26 €» por separar importe y divisa. */
  it('sin precio mostrado usa el de origen con la divisa de origen, nunca cruzados', () => {
    expect(precioCongelado(linea({ precioUnitarioOrigen: 117, divisaDeOrigen: 'CNY' }))).toEqual({
      importe: 117,
      divisa: 'CNY',
    });
  });

  it('un precio mostrado a cero no cuenta: se cae al de origen', () => {
    expect(
      precioCongelado(linea({ precioUnitarioMostrado: 0, divisaMostrada: 'EUR' })).divisa,
    ).toBe('CNY');
  });
});

describe('insertaOFusiona', () => {
  it('suma cantidades de la misma variante y se queda con el dato del recién llegado', () => {
    const resultado = insertaOFusiona(
      [linea({ variantId: 'v1', cantidad: 2, sku: 'VIEJO' })],
      linea({ variantId: 'v1', cantidad: 3, sku: 'NUEVO', precioUnitarioOrigen: 12 }),
    );

    expect(resultado).toHaveLength(1);
    expect(resultado[0].cantidad).toBe(5);
    expect(resultado[0].sku).toBe('NUEVO');
    expect(resultado[0].precioUnitarioOrigen).toBe(12);
  });

  it('conserva el dato antiguo cuando el nuevo no lo trae', () => {
    const resultado = insertaOFusiona(
      [linea({ variantId: 'v1', imagen: 'foto.webp' })],
      linea({ variantId: 'v1' }),
    );

    expect(resultado[0].imagen).toBe('foto.webp');
  });

  it('añade una variante distinta como línea nueva', () => {
    const resultado = insertaOFusiona([linea({ variantId: 'v1' })], linea({ variantId: 'v2' }));

    expect(resultado).toHaveLength(2);
  });

  /** Cestas heredadas con el mismo producto tres veces: no se pierde ninguna unidad. */
  it('colapsa varios duplicados sin perder unidades', () => {
    const resultado = insertaOFusiona(
      [linea({ cantidad: 2 }), linea({ cantidad: 3 })],
      linea({ cantidad: 1 }),
    );

    expect(resultado).toHaveLength(1);
    expect(resultado[0].cantidad).toBe(6);
  });
});

describe('aseguraLinea', () => {
  /** No suma: si la escritura llegó y solo se perdió la respuesta, sumar doblaría el pedido. */
  it('no duplica una línea que ya estaba', () => {
    const resultado = aseguraLinea([linea({ cantidad: 4 })], linea({ cantidad: 1 }));

    expect(resultado).toHaveLength(1);
    expect(resultado[0].cantidad).toBe(4);
  });

  it('la añade cuando no estaba', () => {
    expect(aseguraLinea([], linea())).toHaveLength(1);
  });
});

describe('sinLinea', () => {
  it('quita solo la variante indicada', () => {
    const resultado = sinLinea([linea({ variantId: 'v1' }), linea({ variantId: 'v2' })], {
      productId: 'p1',
      variantId: 'v1',
    });

    expect(resultado).toHaveLength(1);
    expect(resultado[0].variantId).toBe('v2');
  });
});

describe('deduplica', () => {
  /** El caso real: la misma línea en yuanes y en euros, con subtotales incongruentes. */
  it('se queda con la que declara divisa de origen y suma las cantidades', () => {
    const resultado = deduplica([
      linea({ cantidad: 1, precioUnitarioOrigen: 117, divisaDeOrigen: '' }),
      linea({ cantidad: 2, precioUnitarioOrigen: 14.9, divisaDeOrigen: 'EUR' }),
    ]);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].cantidad).toBe(3);
    expect(resultado[0].divisaDeOrigen).toBe('EUR');
  });

  it('en empate de divisa gana el importe mayor', () => {
    const resultado = deduplica([
      linea({ precioUnitarioOrigen: 5, divisaDeOrigen: 'EUR' }),
      linea({ precioUnitarioOrigen: 9, divisaDeOrigen: 'EUR' }),
    ]);

    expect(resultado[0].precioUnitarioOrigen).toBe(9);
  });

  it('conserva el sku de la que lo tenga, venga de donde venga', () => {
    const resultado = deduplica([
      linea({ sku: 'SKU-1', divisaDeOrigen: 'EUR', precioUnitarioOrigen: 9 }),
      linea({ divisaDeOrigen: 'EUR', precioUnitarioOrigen: 9 }),
    ]);

    expect(resultado[0].sku).toBe('SKU-1');
  });

  it('deja en paz las líneas que no se repiten', () => {
    expect(deduplica([linea({ variantId: 'v1' }), linea({ variantId: 'v2' })])).toHaveLength(2);
  });
});

describe('unidadesTotales', () => {
  it('suma las cantidades de todas las líneas', () => {
    expect(unidadesTotales([linea({ cantidad: 2 }), linea({ cantidad: 3 })])).toBe(5);
  });
});

describe('skuVisible', () => {
  it('usa el sku cuando lo hay', () => {
    expect(skuVisible(linea({ sku: 'ABC-123' }))).toBe('ABC-123');
  });

  /** Una fila sin identificador deja a quien reclama sin poder decir de qué habla. */
  it('cae al identificador de variante recortado, y luego al del producto', () => {
    expect(skuVisible(linea({ sku: '  ', variantId: '3f2504e0-4f89' }))).toBe('3f2504e0');
    expect(skuVisible(linea({ productId: 'abcdefghij' }))).toBe('abcdefgh');
  });
});

describe('claveDeLinea', () => {
  it('la variante ausente y la vacía dan la misma clave', () => {
    expect(claveDeLinea({ productId: 'p1', variantId: '' })).toBe(
      claveDeLinea({ productId: 'p1' }),
    );
  });
});
