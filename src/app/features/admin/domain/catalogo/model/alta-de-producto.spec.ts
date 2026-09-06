import {
  BORRADOR_DE_ALTA_VACIO,
  BorradorDeAlta,
  CAMPOS_DE_ALTA_VACIOS,
  RESENA_TECLEADA_VACIA,
  TRAMO_TECLEADO_VACIO,
  VARIANTE_TECLEADA_VACIA,
  validaAlta,
} from './alta-de-producto';
import {
  asignacionesPorLinea,
  conteosPorComas,
  enteroOpcional,
  numeroOpcional,
  paresPorComas,
  porComas,
  porLineas,
  traduccionesPorLinea,
} from './analisis-de-texto';
import { aProductoNuevo } from './producto-nuevo';

const conCampos = (campos: Record<string, string>): BorradorDeAlta => ({
  ...BORRADOR_DE_ALTA_VACIO,
  campos: { ...CAMPOS_DE_ALTA_VACIOS, ...campos },
  contenido: { es: { titulo: 'Auricular', descripcion: '' } },
});

describe('analisis-de-texto', () => {
  it('los números toleran la coma decimal y el campo vacío', () => {
    expect(numeroOpcional('29,90')).toBeCloseTo(29.9);
    expect(numeroOpcional('  ')).toBeUndefined();
    expect(numeroOpcional('x')).toBeUndefined();
  });

  it('los enteros truncan en vez de rechazar: «2,7 días» son 2 días', () => {
    expect(enteroOpcional('2,7')).toBe(2);
    expect(enteroOpcional('')).toBeUndefined();
  });

  it('las listas se escriben por líneas o por comas, y las vacías se caen', () => {
    expect(porLineas(' a \n\n b ')).toEqual(['a', 'b']);
    expect(porComas('CE, RoHS,\n , ISO')).toEqual(['CE', 'RoHS', 'ISO']);
  });

  it('los pares incompletos se descartan sin llevarse el resto', () => {
    expect(paresPorComas('Color:Rojo, mal, Talla:M, vacio:')).toEqual({
      Color: 'Rojo',
      Talla: 'M',
    });
  });

  it('la imagen de cada color se pega como «valor=dirección»', () => {
    expect(asignacionesPorLinea('Rojo=https://a.jpg\nsin-igual\nNegro=https://b.jpg')).toEqual({
      Rojo: 'https://a.jpg',
      Negro: 'https://b.jpg',
    });
  });

  it('la traducción por color admite varios idiomas en una línea', () => {
    expect(traduccionesPorLinea('红色=ES:Rojo, en:Red\nsin-igual\nvacio=')).toEqual({
      红色: { es: 'Rojo', en: 'Red' },
    });
  });

  it('el desglose de estrellas descarta lo que no es un número', () => {
    expect(conteosPorComas('5:120, 4:treinta, 3:5')).toEqual({ '5': 120, '3': 5 });
  });
});

describe('validaAlta', () => {
  /** Con cuarenta campos en trece secciones plegadas, decir CUÁL falta es la diferencia. */
  it('sin categoría no se puede dar de alta', () => {
    expect(validaAlta(BORRADOR_DE_ALTA_VACIO)).toBe('sin_categoria');
  });

  it('la categoría vale por slug o por la de origen', () => {
    expect(validaAlta(conCampos({ category1688Id: '1265467' }))).toBe('sin_precio');
  });

  it('sin título en ningún idioma tampoco', () => {
    const borrador = { ...conCampos({ categorySlug: 'ropa' }), contenido: {} };
    expect(validaAlta(borrador)).toBe('sin_titulo');
  });

  it('el precio puede venir del campo o de un tramo', () => {
    expect(validaAlta(conCampos({ categorySlug: 'ropa' }))).toBe('sin_precio');
    expect(validaAlta(conCampos({ categorySlug: 'ropa', price: '29.9' }))).toBeUndefined();
    expect(
      validaAlta({
        ...conCampos({ categorySlug: 'ropa' }),
        tramos: [{ ...TRAMO_TECLEADO_VACIO, precioUnitario: '18.5' }],
      }),
    ).toBeUndefined();
  });
});

describe('aProductoNuevo', () => {
  it('convierte los escalares y deja fuera lo vacío', () => {
    const producto = aProductoNuevo(
      conCampos({
        categorySlug: 'ropa',
        price: '29,90',
        moq: '3',
        weightGrams: '450',
        certifications: 'CE, RoHS',
        imageUrls: 'https://a.jpg\nhttps://b.jpg',
      }),
    );
    expect(producto.categoriaSlug).toBe('ropa');
    expect(producto.precio).toBeCloseTo(29.9);
    expect(producto.moq).toBe(3);
    expect(producto.pesoGramos).toBe(450);
    expect(producto.certificaciones).toEqual(['CE', 'RoHS']);
    expect(producto.imagenes).toEqual(['https://a.jpg', 'https://b.jpg']);
    expect(producto.urlVideo).toBeUndefined();
  });

  it('el pedido mínimo cae a uno cuando no se pone', () => {
    expect(aProductoNuevo(conCampos({ moq: '' })).moq).toBe(1);
  });

  it('solo viajan los idiomas con título', () => {
    const borrador: BorradorDeAlta = {
      ...conCampos({ categorySlug: 'ropa' }),
      contenido: {
        es: { titulo: 'Auricular', descripcion: 'Con cancelación' },
        en: { titulo: '  ', descripcion: 'Ignorado' },
      },
    };
    expect(Object.keys(aProductoNuevo(borrador).contenido)).toEqual(['es']);
  });

  /** Añadir una fila y no rellenarla no es pedir un tramo sin precio. */
  it('las filas a medio rellenar se descartan', () => {
    const borrador: BorradorDeAlta = {
      ...conCampos({ categorySlug: 'ropa' }),
      tramos: [TRAMO_TECLEADO_VACIO, { ...TRAMO_TECLEADO_VACIO, precioUnitario: '18.5' }],
      variantes: [VARIANTE_TECLEADA_VACIA, { ...VARIANTE_TECLEADA_VACIA, sku: 'HX-1' }],
      resenas: [RESENA_TECLEADA_VACIA, { ...RESENA_TECLEADA_VACIA, cuerpo: 'Muy bien' }],
      atributos: [{ clave: '', valor: '', idioma: '' }, { clave: 'material', valor: 'ABS', idioma: '' }],
      especificaciones: [
        { idioma: 'es', clave: '', valor: '', posicion: '' },
        { idioma: '', clave: 'Material', valor: 'Algodón', posicion: '' },
      ],
      ejes: [
        { nombre: '', valores: '', imagenesPorValor: '', traduccionesPorValor: '' },
        { nombre: 'Color', valores: 'Rojo, Negro', imagenesPorValor: 'Rojo=https://r.jpg', traduccionesPorValor: '' },
      ],
    };
    const producto = aProductoNuevo(borrador);
    expect(producto.tramos.length).toBe(1);
    expect(producto.variantes.length).toBe(1);
    expect(producto.resenas.length).toBe(1);
    expect(producto.atributos).toEqual([{ clave: 'material', valor: 'ABS', idioma: undefined }]);
    // El idioma de la ficha técnica cae al español y la posición al orden en que se escribió.
    expect(producto.especificaciones).toEqual([
      { idioma: 'es', clave: 'Material', valor: 'Algodón', posicion: 0 },
    ]);
    expect(producto.ejes[0].valores).toEqual(['Rojo', 'Negro']);
    expect(producto.ejes[0].imagenesPorValor).toEqual({ Rojo: 'https://r.jpg' });
    expect(producto.ejes[0].traduccionesPorValor).toBeUndefined();
  });

  it('la reseña sin estrellas cae a cinco y sin idioma al español', () => {
    const borrador: BorradorDeAlta = {
      ...conCampos({ categorySlug: 'ropa' }),
      resenas: [{ ...RESENA_TECLEADA_VACIA, cuerpo: 'Bien', estrellas: '', idioma: '' }],
    };
    expect(aProductoNuevo(borrador).resenas[0]).toMatchObject({ estrellas: 5, idioma: 'es' });
  });

  it('el desglose de estrellas solo viaja si trae algo', () => {
    expect(aProductoNuevo(conCampos({ ratingBreakdown: '' })).desgloseDeEstrellas).toBeUndefined();
    expect(aProductoNuevo(conCampos({ ratingBreakdown: '5:10' })).desgloseDeEstrellas).toEqual({
      '5': 10,
    });
  });
});
