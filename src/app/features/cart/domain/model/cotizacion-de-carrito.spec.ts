import { LineaDeCarrito } from './linea-de-carrito';
import {
  aItemsACotizar,
  cotizacionDeLinea,
  firmaDeLaCesta,
  formateaPeso,
} from './cotizacion-de-carrito';

function linea(parcial: Partial<LineaDeCarrito> = {}): LineaDeCarrito {
  return {
    productId: 'p1',
    slug: 's',
    titulo: 'T',
    precioUnitarioOrigen: 1,
    divisaDeOrigen: 'CNY',
    cantidad: 1,
    ...parcial,
  };
}

describe('formateaPeso', () => {
  it('en gramos por debajo del kilo', () => {
    expect(formateaPeso(320)).toBe('320 g');
  });

  /** «1.2 kg» en una pantalla en español se lee como mil doscientos: el separador sigue al IDIOMA. */
  it('en kilos por encima, con el separador del idioma elegido', () => {
    expect(formateaPeso(1200, 'es')).toBe('1,2 kg');
    expect(formateaPeso(1200, 'en')).toBe('1.2 kg');
  });

  it('el kilo justo ya se escribe en kilos', () => {
    expect(formateaPeso(1000, 'en')).toBe('1 kg');
  });
});

describe('firmaDeLaCesta', () => {
  it('cambia al cambiar la cantidad y no cambia al repetir la misma cesta', () => {
    const cesta = [linea({ cantidad: 2 })];

    expect(firmaDeLaCesta(cesta)).toBe(firmaDeLaCesta([linea({ cantidad: 2 })]));
    expect(firmaDeLaCesta(cesta)).not.toBe(firmaDeLaCesta([linea({ cantidad: 3 })]));
  });

  it('la variante vacía y la ausente dan la misma firma', () => {
    expect(firmaDeLaCesta([linea({ variantId: '' })])).toBe(firmaDeLaCesta([linea()]));
  });
});

describe('cotizacionDeLinea', () => {
  const cotizacion = {
    lineas: [{ productId: 'p1', variantId: 'v1', unitarioFormateado: '28,26 €' }],
  };

  it('encuentra la línea por producto y variante', () => {
    expect(cotizacionDeLinea(cotizacion, linea({ variantId: 'v1' }))?.unitarioFormateado).toBe(
      '28,26 €',
    );
  });

  it('sin cotización no devuelve nada', () => {
    expect(cotizacionDeLinea(undefined, linea())).toBeUndefined();
  });
});

describe('aItemsACotizar', () => {
  /** Al servidor solo viaja QUÉ y CUÁNTO: ningún importe sale del navegador. */
  it('manda producto, variante y cantidad, y nada más', () => {
    expect(aItemsACotizar([linea({ variantId: 'v1', cantidad: 4 })])).toEqual([
      { productId: 'p1', variantId: 'v1', cantidad: 4 },
    ]);
  });
});
