import { LineaDeCarrito } from './linea-de-carrito';
import {
  lineasDelProducto,
  minimoDelProducto,
  puedeBajarUnaUnidad,
  puedeSacarLaLinea,
  unidadesDelProducto,
} from './pedido-minimo';

function linea(parcial: Partial<LineaDeCarrito> = {}): LineaDeCarrito {
  return {
    productId: 'p1',
    slug: 'camiseta',
    titulo: 'Camiseta',
    precioUnitarioOrigen: 10,
    divisaDeOrigen: 'CNY',
    cantidad: 1,
    ...parcial,
  };
}

/**
 * LA REGLA: el mínimo se cumple con la SUMA de todas las variantes del mismo producto. Contarlo por línea
 * bloquea compras que el proveedor sirve; no contarlo deja cobrar pedidos que no acepta.
 */
describe('pedido mínimo', () => {
  it('cuenta las unidades sumando TODAS las variantes del producto', () => {
    const cesta = [
      linea({ variantId: 'M', cantidad: 3 }),
      linea({ variantId: 'L', cantidad: 2 }),
      linea({ productId: 'p2', cantidad: 9 }),
    ];

    expect(unidadesDelProducto(cesta, 'p1')).toBe(5);
  });

  it('un mínimo ausente o a cero vale uno', () => {
    expect(minimoDelProducto([linea()], 'p1')).toBe(1);
    expect(minimoDelProducto([linea({ pedidoMinimo: 0 })], 'p1')).toBe(1);
    expect(minimoDelProducto([linea({ pedidoMinimo: 5 })], 'p1')).toBe(5);
  });

  it('tres tallas M y dos L cumplen un mínimo de cinco', () => {
    const cesta = [
      linea({ variantId: 'M', cantidad: 3, pedidoMinimo: 5 }),
      linea({ variantId: 'L', cantidad: 2, pedidoMinimo: 5 }),
    ];

    // Bajar una dejaría cuatro: por debajo del mínimo y por encima de cero.
    expect(puedeBajarUnaUnidad(cesta, { productId: 'p1', variantId: 'M' })).toEqual({
      permitido: false,
      minimo: 5,
      hayProductoEntero: false,
    });
  });

  it('llegar a cero SIEMPRE vale: quitarlo del todo es una cesta válida', () => {
    const cesta = [linea({ cantidad: 1, pedidoMinimo: 5 })];

    expect(puedeBajarUnaUnidad(cesta, { productId: 'p1' }).permitido).toBe(true);
  });

  it('deja bajar mientras el producto siga cumpliendo su mínimo', () => {
    const cesta = [linea({ cantidad: 6, pedidoMinimo: 5 })];

    expect(puedeBajarUnaUnidad(cesta, { productId: 'p1' }).permitido).toBe(true);
  });

  /**
   * Sin la salida del producto entero, un producto en dos líneas queda ATRAPADO: cada una deja a la otra
   * por debajo del mínimo y ninguna se puede sacar.
   */
  it('al sacar una línea que dejaría el producto corto, ofrece sacarlo entero', () => {
    const cesta = [
      linea({ variantId: 'M', cantidad: 3, pedidoMinimo: 5 }),
      linea({ variantId: 'L', cantidad: 2, pedidoMinimo: 5 }),
    ];

    expect(puedeSacarLaLinea(cesta, { productId: 'p1', variantId: 'M' })).toEqual({
      permitido: false,
      minimo: 5,
      hayProductoEntero: true,
    });
  });

  it('sacar la única línea del producto vale: quedan cero unidades', () => {
    const cesta = [linea({ cantidad: 3, pedidoMinimo: 5 })];

    expect(puedeSacarLaLinea(cesta, { productId: 'p1' }).permitido).toBe(true);
  });

  it('una línea que ya no está no impide nada', () => {
    expect(puedeSacarLaLinea([], { productId: 'p1' }).permitido).toBe(true);
  });

  it('reúne todas las líneas de un producto para poder sacarlo entero', () => {
    const cesta = [linea({ variantId: 'M' }), linea({ variantId: 'L' }), linea({ productId: 'p2' })];

    expect(lineasDelProducto(cesta, 'p1')).toHaveLength(2);
  });
});
