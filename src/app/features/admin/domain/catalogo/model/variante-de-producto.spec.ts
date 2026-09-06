import {
  BORRADOR_DE_VARIANTE_VACIO,
  VarianteDeProducto,
  aBorrador,
  desdeBorrador,
  desviacionDePrecio,
  opcionesATexto,
  precioDeReferencia,
  textoAOpciones,
  variantesCambiadas,
} from './variante-de-producto';

const variante = (id: string, precio?: number): VarianteDeProducto => ({
  id,
  sku: `SKU-${id}`,
  titulo: `Variante ${id}`,
  precio,
  existencias: 5,
  opciones: { Color: 'Rojo' },
  activa: true,
});

describe('variante-de-producto', () => {
  it('las opciones van y vuelven del texto sin perderse', () => {
    expect(opcionesATexto({ Color: 'Rojo', Talla: 'M' })).toBe('Color:Rojo, Talla:M');
    expect(textoAOpciones('Color:Rojo, Talla:M')).toEqual({ Color: 'Rojo', Talla: 'M' });
  });

  it('un par sin dos puntos se descarta en vez de romper el resto', () => {
    expect(textoAOpciones('Color:Rojo, suelto, Talla:M')).toEqual({ Color: 'Rojo', Talla: 'M' });
  });

  it('sin opciones, el texto es vacío', () => {
    expect(opcionesATexto(undefined)).toBe('');
  });

  it('el borrador conserva lo que trae la variante', () => {
    expect(aBorrador(variante('1', 18.5))).toEqual({
      sku: 'SKU-1',
      titulo: 'Variante 1',
      precio: '18.5',
      existencias: '5',
      opciones: 'Color:Rojo',
      urlImagen: '',
    });
  });

  /** Una variante sin nombre no se distingue de otra en la tabla: el SKU hace de respaldo. */
  it('al guardar, el título cae al SKU cuando se deja vacío', () => {
    const cambios = desdeBorrador({ ...BORRADOR_DE_VARIANTE_VACIO, sku: ' A-1 ' });
    expect(cambios.titulo).toBe('A-1');
    expect(cambios.precio).toBeNull();
    expect(cambios.existencias).toBe(0);
    expect(cambios.urlImagen).toBeNull();
  });

  describe('precioDeReferencia', () => {
    /** Es la variante más barata la que fija el «desde» de la ficha, no el coste base. */
    it('es el de la variante más barata', () => {
      expect(precioDeReferencia([variante('1', 20), variante('2', 12)], 30)).toBe(12);
    });

    it('las variantes sin precio caen al coste base', () => {
      expect(precioDeReferencia([variante('1'), variante('2')], 30)).toBe(30);
    });

    it('sin precios ni coste, la referencia es cero', () => {
      expect(precioDeReferencia([], undefined)).toBe(0);
    });
  });

  describe('desviacionDePrecio', () => {
    /** Con una sola variante la desviación tiene que leerse cero, o parece que algo falla. */
    it('la variante de referencia se desvía cero', () => {
      expect(desviacionDePrecio(12, 12)).toBe(0);
    });

    it('mide el porcentaje contra la referencia', () => {
      expect(desviacionDePrecio(18, 12)).toBeCloseTo(50);
    });

    it('sin referencia no se inventa una desviación', () => {
      expect(desviacionDePrecio(18, 0)).toBe(0);
    });
  });

  describe('variantesCambiadas', () => {
    it('solo devuelve las que de verdad se tocaron', () => {
      const lista = [variante('1', 10), variante('2', 20)];
      const borradores = {
        '1': aBorrador(lista[0]),
        '2': { ...aBorrador(lista[1]), precio: '25' },
      };
      expect(variantesCambiadas(lista, borradores).map((v) => v.id)).toEqual(['2']);
    });

    it('una variante sin borrador no cuenta como cambiada', () => {
      expect(variantesCambiadas([variante('1', 10)], {})).toEqual([]);
    });
  });
});
