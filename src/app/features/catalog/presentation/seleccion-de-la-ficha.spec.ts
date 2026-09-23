import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exito } from '@shared/result/result';
import { ConsultaElPrecioPorCantidad } from '../application/use-case/consulta-el-precio-por-cantidad.use-case';
import { PRECIO_POR_CANTIDAD_PORT } from '../domain/port/precio-por-cantidad.port';
import { EjeDeVariante, FichaDeProducto } from '../domain/model/producto';
import { SeleccionDeLaFicha } from './seleccion-de-la-ficha';

function eje(nombre: string, valores: string[]): EjeDeVariante {
  return {
    id: nombre,
    nombreZh: nombre,
    nombre,
    posicion: 0,
    valores: valores.map((valor, i) => ({ id: `${nombre}-${i}`, valorZh: valor, valor, posicion: i })),
  };
}

function ficha(cambios: Partial<FichaDeProducto> = {}): FichaDeProducto {
  return {
    id: 'p1',
    slug: 'gorro',
    titulo: 'Gorro',
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

const CON_TALLAS = ficha({
  moq: 6,
  ejesDeVariante: [eje('Color', ['Rojo', 'Azul']), eje('Talla', ['S', 'M'])],
  variantes: [
    { id: 'r-s', existencias: 4, opciones: { Color: 'Rojo', Talla: 'S' }, activa: true, precio: 9 },
    { id: 'r-m', existencias: 0, opciones: { Color: 'Rojo', Talla: 'M' }, activa: true },
    { id: 'a-s', existencias: 2, opciones: { Color: 'Azul', Talla: 'S' }, activa: true },
  ],
});

/** Escalera de cantidades: a partir de diez unidades el proveedor baja el precio. */
const TRAMOS = [
  { cantidadMinima: 1, cantidadMaxima: 9, precioUnitario: 10, divisa: 'EUR', precioUnitarioFormateado: '10,00 €' },
  { cantidadMinima: 10, precioUnitario: 8, divisa: 'EUR', precioUnitarioFormateado: '8,00 €' },
];

describe('SeleccionDeLaFicha', () => {
  let seleccion: SeleccionDeLaFicha;
  let cotizado: ReturnType<typeof vi.fn>;

  function monta(): void {
    TestBed.resetTestingModule();
    cotizado = vi.fn(async () => exito({ unitarioFormateado: '7,60 €', totalFormateado: '76,00 €' }));
    TestBed.configureTestingModule({
      providers: [
        SeleccionDeLaFicha,
        ConsultaElPrecioPorCantidad,
        { provide: PRECIO_POR_CANTIDAD_PORT, useValue: { cotiza: cotizado } },
      ],
    });
    seleccion = TestBed.inject(SeleccionDeLaFicha);
  }

  beforeEach(() => monta());

  /** Con «pedido mín. 6» se arranca en 6, no en 1: descubrirlo al pagar obliga a rehacerlo todo. */
  it('empieza respetando el pedido mínimo', () => {
    seleccion.empieza(CON_TALLAS);
    expect(seleccion.cantidad()).toBe(6);
    expect(seleccion.minimoDelSelector()).toBe(6);
  });

  it('reconoce los dos ejes del producto', () => {
    seleccion.empieza(CON_TALLAS);
    expect(seleccion.ejeDeColor()?.nombre).toBe('Color');
    expect(seleccion.ejeDeTalla()?.nombre).toBe('Talla');
  });

  it('las existencias de una talla son las del color que se está mirando', () => {
    seleccion.empieza(CON_TALLAS);
    seleccion.eligeColor('Rojo');
    expect(seleccion.existenciasDeTalla('S')).toBe(4);
    seleccion.eligeColor('Azul');
    expect(seleccion.existenciasDeTalla('S')).toBe(2);
  });

  /** Sin el reajuste, «añadir» metía unidades de una talla marcada «sin stock». */
  it('al cambiar de color recorta las unidades al stock nuevo', () => {
    seleccion.empieza(CON_TALLAS);
    seleccion.eligeColor('Rojo');
    seleccion.fijaUnidadesDeTalla('S', 4);
    seleccion.eligeColor('Azul');
    expect(seleccion.unidadesPorTalla()['S']).toBe(2);
  });

  it('no deja pedir más de lo que hay', () => {
    seleccion.empieza(CON_TALLAS);
    seleccion.eligeColor('Rojo');
    seleccion.fijaUnidadesDeTalla('S', 99);
    expect(seleccion.unidadesPorTalla()['S']).toBe(4);
  });

  it('el impedimento cambia según lo que falte', () => {
    seleccion.empieza(CON_TALLAS);
    expect(seleccion.impedimento()).toBe('falta-elegir-variante');
    seleccion.eligeColor('Rojo');
    expect(seleccion.impedimento()).toBe('falta-elegir-talla');
    seleccion.fijaUnidadesDeTalla('S', 2);
    expect(seleccion.impedimento()).toBe('pedido-minimo');
    expect(seleccion.unidadesQueFaltan()).toBe(4);
    seleccion.fijaUnidadesDeTalla('S', 4);
    // Cuatro de las seis del lote: sigue faltando, y lo que falta se dice con exactitud.
    expect(seleccion.impedimento()).toBe('pedido-minimo');
    expect(seleccion.unidadesQueFaltan()).toBe(2);
  });

  it('sin pedido mínimo, elegir una talla basta para poder añadir', () => {
    seleccion.empieza({ ...CON_TALLAS, moq: 1 });
    seleccion.eligeColor('Rojo');
    seleccion.fijaUnidadesDeTalla('S', 1);
    expect(seleccion.impedimento()).toBeNull();
  });

  it('las líneas a añadir salen de las tallas con unidades', () => {
    seleccion.empieza(CON_TALLAS);
    seleccion.eligeColor('Rojo');
    seleccion.fijaUnidadesDeTalla('S', 3);
    const lineas = seleccion.lineasAAnadir();
    expect(lineas).toHaveLength(1);
    expect(lineas[0].variante?.id).toBe('r-s');
    expect(lineas[0].cantidad).toBe(3);
  });

  /** Con una sola variante no hay nada que elegir: el precio y el stock son los suyos desde el inicio. */
  it('con una sola variante la toma sin que nadie la elija', () => {
    const unica = ficha({
      variantes: [{ id: 'v', existencias: 3, opciones: {}, activa: true, precio: 7, precioFormateado: '7,00 €' }],
    });
    seleccion.empieza(unica);
    expect(seleccion.varianteElegida()?.id).toBe('v');
    expect(seleccion.precioDestacado().formateado).toBe('7,00 €');
  });

  /** Pedir el mínimo otra vez multiplicaría el pedido de quien ya tenía unidades dentro. */
  it('tras añadir, la siguiente tanda parte de lo que falta', () => {
    seleccion.empieza(CON_TALLAS);
    seleccion.eligeColor('Rojo');
    seleccion.fijaUnidadesDeTalla('S', 4);
    seleccion.limpiaCantidades();
    expect(seleccion.unidadesPorTalla()).toEqual({});
    expect(seleccion.minimoDelSelector()).toBe(2);
  });

  it('la foto del color se recuerda y se olvida', () => {
    seleccion.empieza(CON_TALLAS);
    seleccion.fijaFotoDelColor('rojo.jpg');
    expect(seleccion.fotoDelColor()).toBe('rojo.jpg');
    seleccion.olvidaLaFotoDelColor();
    expect(seleccion.fotoDelColor()).toBeNull();
  });

  it('sin ficha no hay precio que destacar', () => {
    seleccion.empieza(null);
    expect(seleccion.precioDestacado().importe).toBeNull();
  });

  it('la cantidad nunca baja del mínimo', () => {
    seleccion.empieza(CON_TALLAS);
    seleccion.fijaCantidad(1);
    expect(seleccion.cantidad()).toBe(6);
  });

  it('conoce lo que ya lleva de este producto en la cesta', () => {
    seleccion.empieza(CON_TALLAS);
    seleccion.fijaLoQueYaLleva(4);
    expect(seleccion.minimoDelSelector()).toBe(2);
  });

  it('rotula un valor de eje en el idioma activo', () => {
    seleccion.empieza(CON_TALLAS);
    expect(seleccion.etiquetaDe({ id: '1', valorZh: '黑色', posicion: 0 })).not.toBe('');
  });

  /**
   * El precio grande de la ficha con un tramo alcanzado sale del SERVIDOR.
   *
   * <p>Qué se rompía en producción antes de esta prueba: mandaba el precio de la variante y la
   * cantidad no se miraba. Con mil unidades en la cesta la ficha seguía anunciando el precio de una,
   * mientras el cobro sí aplicaba el tramo: el «veo X y me cobran Y» de siempre, esta vez a favor de
   * la tienda y por tanto todavía peor.
   *
   * <p>No se compone aquí porque no se puede: el tramo es del producto, la variante tiene su coste, y
   * el escalón se aplica como una proporción sobre ella. Multiplicar en el navegador es justo lo que
   * la norma del proyecto prohíbe.
   */
  it('con un tramo alcanzado, el precio destacado es el que dice el servidor', async () => {
    seleccion.empieza(ficha({ tramosDePrecio: TRAMOS }));
    seleccion.fijaCantidad(10);
    // Leer el precio es lo que engancha la consulta: el recurso es perezoso y no arranca hasta que
    // alguien lo mira. Es justo lo que se quiere —una ficha que nadie abre no pide nada—.
    //
    // Mientras la respuesta viaja se enseña el precio del tramo tal cual lo publica la ficha (8,00 €).
    // Es una aproximación buena —y la única que había antes—, pero no es la que se cobra: le falta
    // aplicar la proporción sobre el precio de ESTA variante, y eso solo lo sabe el servidor.
    expect(seleccion.precioDestacado().formateado).toBe('8,00 €');
    await TestBed.inject(ApplicationRef).whenStable();

    expect(cotizado).toHaveBeenCalledWith('p1', undefined, 10);
    expect(seleccion.precioDestacado().formateado).toBe('7,60 €');
  });

  /** Por debajo del primer escalón el precio de la ficha ya es el bueno: no se molesta al servidor. */
  it('con una sola unidad no pregunta nada y deja el precio de la ficha', async () => {
    seleccion.empieza(ficha({ tramosDePrecio: TRAMOS }));
    seleccion.fijaCantidad(1);
    expect(seleccion.precioDestacado().formateado).toBe('10,00 €');
    await TestBed.inject(ApplicationRef).whenStable();

    expect(cotizado).not.toHaveBeenCalled();
    expect(seleccion.precioDestacado().formateado).toBe('10,00 €');
  });

  /** Sin escalera no hay nada que cotizar por mucha cantidad que se pida. */
  it('sin tramos no pregunta nada aunque se pidan mil unidades', async () => {
    seleccion.empieza(ficha());
    seleccion.fijaCantidad(1000);
    void seleccion.precioDestacado();
    await TestBed.inject(ApplicationRef).whenStable();

    expect(cotizado).not.toHaveBeenCalled();
  });
});
