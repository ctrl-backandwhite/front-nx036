import { describe, expect, it } from 'vitest';
import {
  Categoria,
  aplanaCategorias,
  categoriasConProductos,
  diasQueQuedan,
  enCentimetros,
  hayBascula,
  hayResenasDelProveedor,
  idiomasDeLasResenas,
  repartoEnPorcentaje,
  volumenCm3,
} from './catalogo-auxiliar';

function categoria(id: string, cuantos: number, hijas: Categoria[] = []): Categoria {
  return { id, slug: id, nombre: id, posicion: 0, cuantosProductos: cuantos, hijas };
}

describe('categorías', () => {
  const arbol = [categoria('moda', 0, [categoria('gorros', 12), categoria('vacia', 0)])];

  it('aplana el árbol entero, que es lo que hace falta para rotular la elegida', () => {
    expect(aplanaCategorias(arbol).map((c) => c.id)).toEqual(['moda', 'gorros', 'vacia']);
  });

  /** El filtro ofrece solo las que tienen productos: elegir una vacía deja la pantalla en blanco. */
  it('el filtro se queda con las que tienen productos', () => {
    expect(categoriasConProductos(aplanaCategorias(arbol)).map((c) => c.id)).toEqual(['gorros']);
  });
});

describe('reseñas', () => {
  it('reparte las estrellas en porcentaje, de cinco a una', () => {
    const reparto = repartoEnPorcentaje({ '5': 3, '4': 1 });
    expect(reparto[0]).toEqual({ estrellas: 5, porcentaje: 75 });
    expect(reparto[4]).toEqual({ estrellas: 1, porcentaje: 0 });
  });

  it('sin ninguna reseña no divide por cero', () => {
    expect(repartoEnPorcentaje({})[0].porcentaje).toBe(0);
  });

  it('lista los idiomas presentes sin repetir', () => {
    expect(
      idiomasDeLasResenas([
        { id: '1', valoracion: 5, idioma: 'es' },
        { id: '2', valoracion: 4, idioma: 'es' },
        { id: '3', valoracion: 4 },
        { id: '4', valoracion: 3, idioma: 'en' },
      ]),
    ).toEqual(['es', 'en']);
  });

  /** Presentarlas como propias es una práctica desleal de la lista negra de la Directiva Ómnibus. */
  it('detecta si alguna viene del catálogo del proveedor', () => {
    expect(hayResenasDelProveedor([{ id: '1', valoracion: 5, origen: 'SUPPLIER' }])).toBe(true);
    expect(hayResenasDelProveedor([{ id: '1', valoracion: 5, origen: 'CUSTOMER' }])).toBe(false);
  });
});

describe('diasQueQuedan', () => {
  const ahora = new Date('2026-09-06T00:00:00Z').getTime();

  it('cuenta los días hasta el final de la rebaja', () => {
    expect(diasQueQuedan('2026-09-09T00:00:00Z', ahora)).toBe(3);
  });

  it('una rebaja ya terminada no anuncia nada', () => {
    expect(diasQueQuedan('2026-09-01T00:00:00Z', ahora)).toBeNull();
  });

  it('sin fecha de fin tampoco', () => {
    expect(diasQueQuedan(undefined, ahora)).toBeNull();
  });
});

describe('báscula', () => {
  it('pasa milímetros a centímetros y marca lo que falta', () => {
    expect(enCentimetros(1250)).toBe('125');
    expect(enCentimetros(0)).toBe('—');
    expect(enCentimetros(undefined)).toBe('—');
  });

  it('el volumen se calcula con las tres medidas', () => {
    const variante = {
      id: 'v',
      existencias: 0,
      opciones: {},
      activa: true,
      largoMm: 100,
      anchoMm: 100,
      altoMm: 100,
    };
    expect(volumenCm3(variante)).toBe((1000).toLocaleString());
  });

  it('sin las tres medidas no se inventa un volumen', () => {
    expect(volumenCm3({ id: 'v', existencias: 0, opciones: {}, activa: true, largoMm: 100 })).toBe('—');
  });

  it('sin ningún dato, la tabla entera sobra', () => {
    expect(hayBascula([{ id: 'v', existencias: 0, opciones: {}, activa: true }])).toBe(false);
    expect(
      hayBascula([{ id: 'v', existencias: 0, opciones: {}, activa: true, pesoGramos: 200 }]),
    ).toBe(true);
  });
});
