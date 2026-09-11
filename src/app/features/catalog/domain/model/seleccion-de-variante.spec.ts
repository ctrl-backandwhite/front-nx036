import { describe, expect, it } from 'vitest';
import { EjeDeVariante, FichaDeProducto, VarianteDeProducto } from './producto';
import {
  ejeDeTalla,
  ejePrincipal,
  etiquetaDeValor,
  etiquetaDeVariante,
  existenciasDe,
  impedimentoParaAnadir,
  minimoDelSelector,
  precioDestacado,
  reajustaAlCambiarDeColor,
  tramoAplicable,
  unidadesQueFaltan,
  varianteQueCasa,
} from './seleccion-de-variante';

function eje(nombre: string, valores: string[]): EjeDeVariante {
  return {
    id: nombre,
    nombreZh: nombre,
    nombre,
    posicion: 0,
    valores: valores.map((valor, i) => ({ id: `${nombre}-${i}`, valorZh: valor, valor, posicion: i })),
  };
}

function variante(cambios: Partial<VarianteDeProducto> = {}): VarianteDeProducto {
  return { id: 'v', existencias: 5, opciones: {}, activa: true, ...cambios };
}

function ficha(cambios: Partial<FichaDeProducto> = {}): FichaDeProducto {
  return {
    id: 'p1',
    slug: 's',
    titulo: 'Producto',
    ventasMensuales: 0,
    estado: 'ACTIVE',
    precio: { formateado: '10,00 €', importe: 10, divisa: 'EUR' },
    arancel: { centimosExtra: null, cubierto: false },
    etiquetas: [],
    origen: '1688',
    idExterno: '1',
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

describe('reconocimiento de ejes', () => {
  it('encuentra la talla por su nombre en cualquiera de los idiomas del proveedor', () => {
    expect(ejeDeTalla([eje('尺码', ['S'])])?.nombre).toBe('尺码');
    expect(ejeDeTalla([eje('Talla', ['S'])])?.nombre).toBe('Talla');
  });

  it('el eje principal es el color cuando lo hay', () => {
    const ejes = [eje('Talla', ['S']), eje('Color', ['Rojo'])];
    expect(ejePrincipal(ejes)?.nombre).toBe('Color');
  });

  /** Sin eje de color reconocible, esos productos se quedaban sin ningún selector. */
  it('sin color reconocible toma el primero que no sea la talla', () => {
    const ejes = [eje('Talla', ['S']), eje('Modelo', ['A'])];
    expect(ejePrincipal(ejes)?.nombre).toBe('Modelo');
  });

  /**
   * Un eje SIN valores no es un eje.
   *
   * <p>El proveedor manda encabezados vacíos. Contarlos dejaba la ficha exigiendo «selecciona al menos
   * una talla» sin ninguna talla que seleccionar: un callejón del que no se sale por mucho que se
   * pulse, porque el selector no pinta ni una casilla. Caso real: «t-887600913911».
   */
  it('un eje de talla sin valores no cuenta como eje', () => {
    expect(ejeDeTalla([eje('Talla', [])])).toBeUndefined();
    expect(ejeDeTalla([eje('Talla', []), eje('Talla', ['M'])])?.valores).toHaveLength(1);
  });

  it('un eje principal sin valores tampoco cuenta', () => {
    expect(ejePrincipal([eje('Color', [])])).toBeUndefined();
    expect(ejePrincipal([eje('Color', []), eje('Modelo', ['A'])])?.nombre).toBe('Modelo');
  });
});

describe('etiquetaDeValor', () => {
  it('manda la traducción del idioma activo', () => {
    const valor = { id: '1', valorZh: '黑色', valor: 'crudo', valorLocalizado: 'Negro', posicion: 0 };
    expect(etiquetaDeValor(valor, 'es')).toBe('Negro');
  });

  it('sin traducción del idioma, el valor corregido a mano', () => {
    const valor = { id: '1', valorZh: '黑色', valor: 'Negro corregido', posicion: 0 };
    expect(etiquetaDeValor(valor, 'es')).toBe('Negro corregido');
  });

  /** Sin ninguno de los dos se traduce el chino: 驼色 en pantalla no le dice nada a nadie. */
  it('sin nada, traduce el chino con el diccionario compartido', () => {
    const valor = { id: '1', valorZh: '黑色', posicion: 0 };
    expect(etiquetaDeValor(valor, 'es')).toBe('Negro');
  });
});

describe('varianteQueCasa', () => {
  const variantes = [
    variante({ id: 'rojo-s', opciones: { Color: 'Rojo', Talla: 'S' }, existencias: 2 }),
    variante({ id: 'rojo-m', opciones: { Color: 'Rojo', Talla: 'M' }, existencias: 0 }),
    variante({ id: 'azul-s', opciones: { Color: 'Azul', Talla: 'S' }, activa: false }),
  ];

  it('cruza color y talla', () => {
    expect(varianteQueCasa(variantes, 'Rojo', 'M')?.id).toBe('rojo-m');
  });

  it('ignora las variantes desactivadas', () => {
    expect(varianteQueCasa(variantes, 'Azul', 'S')).toBeUndefined();
  });

  it('las existencias son por color Y talla', () => {
    expect(existenciasDe(variantes, 'Rojo', 'S')).toBe(2);
    expect(existenciasDe(variantes, 'Rojo', 'M')).toBe(0);
    expect(existenciasDe(variantes, 'Rojo', 'XL')).toBe(0);
  });
});

describe('tramoAplicable', () => {
  const tramos = [
    { cantidadMinima: 10, precioUnitario: 8, divisa: 'EUR' },
    { cantidadMinima: 1, precioUnitario: 10, divisa: 'EUR' },
    { cantidadMinima: 50, precioUnitario: 6, divisa: 'EUR' },
  ];

  it('toma el mayor de los que la cantidad alcanza', () => {
    expect(tramoAplicable(tramos, 12)?.cantidadMinima).toBe(10);
    expect(tramoAplicable(tramos, 100)?.cantidadMinima).toBe(50);
  });

  it('sin tramos alcanzados no hay tramo', () => {
    expect(tramoAplicable([{ cantidadMinima: 10, precioUnitario: 8, divisa: 'EUR' }], 2)).toBeNull();
    expect(tramoAplicable([], 5)).toBeNull();
  });
});

describe('precioDestacado', () => {
  /** Es lo que el pedido va a cobrar: los tramos son una pista por cantidad, no el cargo por unidad. */
  it('manda el precio de la VARIANTE elegida', () => {
    const elegida = variante({ precio: 7, precioFormateado: '7,00 €' });
    const precio = precioDestacado(ficha(), elegida, {
      cantidadMinima: 1,
      precioUnitario: 9,
      divisa: 'EUR',
      precioUnitarioFormateado: '9,00 €',
    });
    expect(precio.formateado).toBe('7,00 €');
    expect(precio.importe).toBe(7);
  });

  it('sin variante elegida cae al tramo', () => {
    const precio = precioDestacado(ficha(), undefined, {
      cantidadMinima: 1,
      precioUnitario: 9,
      divisa: 'USD',
      precioUnitarioFormateado: '9,00 $',
    });
    expect(precio.formateado).toBe('9,00 $');
    expect(precio.divisa).toBe('USD');
  });

  it('sin variante ni tramo, el precio publicado', () => {
    expect(precioDestacado(ficha(), undefined, null).formateado).toBe('10,00 €');
  });

  /**
   * Si el backend no manda precio de VENTA no hay nada que pintar: componerlo en el navegador sería
   * inventárselo, porque el coste del proveedor ya no viaja fuera del panel.
   */
  it('sin ningún precio devuelve nulo, para que se pinte un guión', () => {
    const sinPrecio = ficha({ precio: { divisa: 'EUR' } });
    expect(precioDestacado(sinPrecio, undefined, null).importe).toBeNull();
  });

  /** El «antes» del producto junto al «ahora» de la variante llegó a dar un tachado MENOR. */
  it('la rebaja de la variante es la suya, no la del producto', () => {
    const conRebaja = ficha({ precio: { anteriorFormateado: '30,00 €', descuentoPorcentaje: 50 } });
    const elegida = variante({ precio: 7, anteriorFormateado: '9,00 €', descuentoPorcentaje: 22 });
    const precio = precioDestacado(conRebaja, elegida, null);
    expect(precio.anteriorFormateado).toBe('9,00 €');
    expect(precio.descuentoPorcentaje).toBe(22);
  });
});

describe('pedido mínimo', () => {
  /** El lote se compone mezclando colores y tallas: el mínimo se cumple SUMANDO. */
  it('cuenta lo que ya hay en la cesta', () => {
    expect(unidadesQueFaltan(10, 4, 3)).toBe(3);
    expect(unidadesQueFaltan(10, 8, 5)).toBe(0);
  });

  it('sin pedido mínimo no falta nada', () => {
    expect(unidadesQueFaltan(1, 0, 0)).toBe(0);
  });

  /** Pedir el mínimo entero otra vez multiplicaría el pedido de quien ya tenía unidades dentro. */
  it('el selector arranca en lo que FALTA, no en el lote entero', () => {
    expect(minimoDelSelector(10, 0)).toBe(10);
    expect(minimoDelSelector(10, 7)).toBe(3);
    expect(minimoDelSelector(10, 20)).toBe(1);
    expect(minimoDelSelector(1, 0)).toBe(1);
  });
});

describe('impedimentoParaAnadir', () => {
  const base = {
    exigeColor: false,
    colorElegido: null,
    tieneEjeDeTalla: false,
    unidadesPorTalla: 0,
    varianteElegida: undefined,
    unidadesQueFaltan: 0,
  };

  it('sin nada que impida, deja añadir', () => {
    expect(impedimentoParaAnadir({ ...base, tieneEjeDeTalla: false })).toBeNull();
  });

  it('exige elegir color cuando el producto lo tiene', () => {
    expect(impedimentoParaAnadir({ ...base, exigeColor: true })).toBe('falta-elegir-variante');
  });

  it('no deja añadir una variante agotada', () => {
    expect(
      impedimentoParaAnadir({ ...base, varianteElegida: variante({ existencias: 0 }) }),
    ).toBe('variante-sin-existencias');
  });

  it('con tallas, exige elegir al menos una', () => {
    expect(impedimentoParaAnadir({ ...base, tieneEjeDeTalla: true })).toBe('falta-elegir-talla');
  });

  it('el pedido mínimo es lo último que se comprueba', () => {
    expect(
      impedimentoParaAnadir({
        ...base,
        tieneEjeDeTalla: true,
        unidadesPorTalla: 2,
        unidadesQueFaltan: 3,
      }),
    ).toBe('pedido-minimo');
  });
});

describe('reajustaAlCambiarDeColor', () => {
  const variantes = [
    variante({ opciones: { Color: 'Rojo', Talla: 'S' }, existencias: 5 }),
    variante({ opciones: { Color: 'Azul', Talla: 'S' }, existencias: 2 }),
    variante({ opciones: { Color: 'Azul', Talla: 'M' }, existencias: 0 }),
  ];

  /**
   * Sin esto, la casilla de una talla agotada seguía enseñando el número del color anterior y «añadir»
   * metía unidades de una talla marcada «sin stock».
   */
  it('recorta al stock del color nuevo y quita las tallas que ya no sirven', () => {
    expect(reajustaAlCambiarDeColor({ S: 5, M: 3 }, variantes, 'Azul')).toEqual({ S: 2 });
  });
});

describe('etiquetaDeVariante', () => {
  it('junta las opciones para que la cesta enseñe qué se lleva', () => {
    expect(etiquetaDeVariante(variante({ opciones: { Color: 'Rojo', Talla: 'XL' } }))).toBe(
      'Rojo / XL',
    );
  });

  it('sin variante no hay etiqueta', () => {
    expect(etiquetaDeVariante(undefined)).toBeUndefined();
  });

  it('sin opciones tampoco', () => {
    expect(etiquetaDeVariante(variante({ opciones: {} }))).toBeUndefined();
  });
});
