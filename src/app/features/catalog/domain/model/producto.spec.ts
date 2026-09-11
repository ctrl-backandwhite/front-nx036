import { describe, expect, it } from 'vitest';
import {
  FichaDeProducto,
  ResumenDeProducto,
  esSuperventas,
  estaRebajado,
  hayExistencias,
  ventasAbreviadas,
} from './producto';

function resumen(cambios: Partial<ResumenDeProducto> = {}): ResumenDeProducto {
  return {
    id: 'p1',
    slug: 'gorro-de-lana',
    titulo: 'Gorro de lana',
    ventasMensuales: 0,
    estado: 'ACTIVE',
    precio: {},
    arancel: { centimosExtra: null, cubierto: false },
    etiquetas: [],
    ...cambios,
  };
}

function ficha(cambios: Partial<FichaDeProducto> = {}): FichaDeProducto {
  return {
    ...resumen(),
    origen: '1688',
    idExterno: '123',
    moq: 1,
    numeroDeResenas: 0,
    imagenes: [],
    variantes: [],
    ejesDeVariante: [],
    tramosDePrecio: [],
    especificaciones: [],
    atributos: {},
    ...cambios,
  };
}

describe('esSuperventas', () => {
  /**
   * El umbral estaba en las ventas DEL PROVEEDOR, así que la etiqueta prometía al comprador un éxito de
   * esta tienda enseñándole el de otra. Ahora manda la tendencia, que sale de los pedidos reales.
   */
  it('no lo es por vender mucho en el proveedor', () => {
    expect(esSuperventas(resumen({ ventasMensuales: 50_000, tendencia: 0.2 }))).toBe(false);
  });

  it('lo es a partir de media tendencia', () => {
    expect(esSuperventas(resumen({ tendencia: 0.5 }))).toBe(true);
  });

  it('lo es si el backend lo etiqueta a mano', () => {
    expect(esSuperventas(resumen({ etiquetas: ['bestseller'] }))).toBe(true);
  });
});

describe('ventasAbreviadas', () => {
  it('deja el número tal cual hasta cuatro cifras', () => {
    expect(ventasAbreviadas(9999)).toBe('9999');
  });

  it('abrevia en miles a partir de cinco cifras, que ya no caben en la tarjeta', () => {
    expect(ventasAbreviadas(12_345)).toBe('12.3k');
  });
});

describe('estaRebajado', () => {
  /** Con solo una de las dos cosas el bloque queda a medias: un tachado sin ahorro, o un −0 %. */
  it('exige precio anterior Y descuento mayor que cero', () => {
    expect(estaRebajado({ anteriorFormateado: '20 €', descuentoPorcentaje: 25 })).toBe(true);
    expect(estaRebajado({ anteriorFormateado: '20 €', descuentoPorcentaje: 0 })).toBe(false);
    expect(estaRebajado({ descuentoPorcentaje: 25 })).toBe(false);
    expect(estaRebajado({})).toBe(false);
  });
});

describe('hayExistencias', () => {
  /**
   * ESTA PRUEBA DECÍA LO CONTRARIO, y era el fallo.
   *
   * <p>Fijaba que un producto sin variantes «siempre se puede pedir». En la práctica eso dejaba
   * comprar lo que no existe: medido en «t-887600913911», un producto con cero variantes, cero
   * activas y sin unidades declaradas se pintaba con la marca de agua «SIN STOCK» en el listado y
   * añadía al carrito sin protestar desde la ficha. Las dos pantallas decían cosas distintas del
   * mismo producto, y la que se creía era la equivocada.
   *
   * <p>Sin variantes no queda ninguna fuente que consultar salvo lo que el proveedor declare del
   * producto entero, así que la ausencia de dato ya no se lee como «hay de sobra».
   */
  it('sin variantes y sin unidades declaradas NO se puede pedir', () => {
    expect(hayExistencias(ficha())).toBe(false);
  });

  it('sin variantes pero con unidades declaradas sí se puede pedir', () => {
    expect(hayExistencias(ficha({ unidadesDisponibles: 25 }))).toBe(true);
    expect(hayExistencias(ficha({ unidadesDisponibles: 0 }))).toBe(false);
  });

  it('suma solo las variantes ACTIVAS', () => {
    const producto = ficha({
      variantes: [
        { id: 'v1', existencias: 10, opciones: {}, activa: false },
        { id: 'v2', existencias: 0, opciones: {}, activa: true },
      ],
    });
    expect(hayExistencias(producto)).toBe(false);
  });

  it('con una variante activa con existencias, sí hay', () => {
    const producto = ficha({
      variantes: [{ id: 'v1', existencias: 3, opciones: {}, activa: true }],
    });
    expect(hayExistencias(producto)).toBe(true);
  });
});
