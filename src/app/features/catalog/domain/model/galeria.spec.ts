import { describe, expect, it } from 'vitest';
import { ImagenDeProducto } from './producto';
import {
  MAXIMO_DE_FOTOS_DEL_PASE,
  claveDeImagen,
  estaEnLaGaleria,
  fotoParaCompartir,
  enEsteOrden,
  enEsteOrdenDentroDelGrupo,
  galeriaDeDetalle,
  galeriaVisible,
  pasosDelPase,
  posicionEnLaGaleria,
  reordena,
} from './galeria';

function imagen(id: string, direccion: string, papel = 'GALLERY'): ImagenDeProducto {
  return { id, direccion, posicion: 0, papel };
}

describe('claveDeImagen', () => {
  /** La misma foto llega con dos direcciones distintas; el identificador de alicdn es el mismo. */
  it('reconoce la misma foto aunque cambie la dirección', () => {
    expect(claveDeImagen('https://cdn/O1CN01abc.jpg')).toBe(
      claveDeImagen('https://otro/O1CN01abc.cib.jpg'),
    );
  });

  it('sin identificador se queda con la dirección entera', () => {
    expect(claveDeImagen('https://cdn/foto.jpg')).toBe('https://cdn/foto.jpg');
  });

  it('sin dirección devuelve una clave vacía', () => {
    expect(claveDeImagen(undefined)).toBe('');
  });
});

describe('galeriaVisible', () => {
  it('quita el vídeo y las fotos repetidas', () => {
    const galeria = galeriaVisible([
      imagen('1', 'https://cdn/O1CN01aaa.jpg'),
      imagen('2', 'https://cdn/O1CN01aaa.cib.jpg'),
      imagen('3', 'https://cdn/otra.mp4', 'video'),
      imagen('4', 'https://cdn/O1CN01bbb.jpg'),
    ]);
    expect(galeria.map((i) => i.id)).toEqual(['1', '4']);
  });
});

describe('estaEnLaGaleria y posicionEnLaGaleria', () => {
  const galeria = [imagen('1', 'https://cdn/O1CN01aaa.jpg'), imagen('2', 'https://cdn/O1CN01bbb.jpg')];

  it('reconoce una foto ya presente aunque venga por otra dirección', () => {
    expect(estaEnLaGaleria(galeria, 'https://otro/O1CN01bbb.cib.jpg')).toBe(true);
    expect(posicionEnLaGaleria(galeria, 'https://otro/O1CN01bbb.cib.jpg')).toBe(1);
  });

  it('dice que no cuando la foto no está', () => {
    expect(estaEnLaGaleria(galeria, 'https://cdn/O1CN01zzz.jpg')).toBe(false);
    expect(posicionEnLaGaleria(galeria, 'https://cdn/O1CN01zzz.jpg')).toBe(-1);
  });
});

describe('pasosDelPase', () => {
  /** Cambiar una foto por sí misma es un parpadeo sin sentido. */
  it('no hay pase con una sola foto', () => {
    expect(pasosDelPase(1)).toBe(0);
    expect(pasosDelPase(0)).toBe(0);
  });

  it('se detiene en el tope aunque la galería sea larguísima', () => {
    expect(pasosDelPase(40)).toBe(MAXIMO_DE_FOTOS_DEL_PASE);
  });
});

describe('reordena', () => {
  const galeria = [imagen('a', 'a'), imagen('b', 'b'), imagen('c', 'c')];

  it('mueve la foto al sitio pedido', () => {
    expect(reordena(galeria, 2, 0)).toEqual(['c', 'a', 'b']);
  });

  it('devuelve el orden intacto si el movimiento no tiene sentido', () => {
    expect(reordena(galeria, 1, 1)).toEqual(['a', 'b', 'c']);
    expect(reordena(galeria, -1, 0)).toEqual(['a', 'b', 'c']);
    expect(reordena(galeria, 0, 9)).toEqual(['a', 'b', 'c']);
  });
});

describe('fotoParaCompartir', () => {
  /** Es la foto de la vista previa en WhatsApp o en una red social: la principal manda. */
  it('prefiere la marcada como principal, esté donde esté', () => {
    const galeria = [imagen('a', 'a.jpg'), imagen('b', 'b.jpg', 'MAIN'), imagen('c', 'c.jpg')];

    expect(fotoParaCompartir(galeria)).toBe('b.jpg');
  });

  it('sin principal, la primera de la galería', () => {
    expect(fotoParaCompartir([imagen('a', 'a.jpg'), imagen('b', 'b.jpg')])).toBe('a.jpg');
  });

  /** El papel viaja tal cual lo manda el backend, y ahí conviven `MAIN` y `video`. */
  it('no distingue mayúsculas en el papel', () => {
    expect(fotoParaCompartir([imagen('a', 'a.jpg'), imagen('b', 'b.jpg', 'main')])).toBe('b.jpg');
  });

  /** El vídeo tiene su propio botón y no es una foto: compartirlo dejaría la vista previa rota. */
  it('nunca devuelve el vídeo', () => {
    expect(fotoParaCompartir([imagen('v', 'v.mp4', 'video'), imagen('a', 'a.jpg')])).toBe('a.jpg');
  });

  /** Sin foto es mejor no declarar ninguna que declarar una vacía: la vista previa sale con hueco gris. */
  it('devuelve indefinido cuando no hay ninguna foto', () => {
    expect(fotoParaCompartir([])).toBeUndefined();
    expect(fotoParaCompartir([imagen('v', 'v.mp4', 'video')])).toBeUndefined();
  });
});

describe('enEsteOrden', () => {
  const foto = (id: string, papel = 'MAIN'): ImagenDeProducto => ({
    id,
    direccion: `${id}.jpg`,
    posicion: 0,
    papel,
  });

  it('coloca las imágenes como diga la lista', () => {
    const orden = enEsteOrden([foto('a'), foto('b'), foto('c')], ['c', 'a', 'b']);

    expect(orden.map((i) => i.id)).toEqual(['c', 'a', 'b']);
  });

  /**
   * El vídeo y las fotos repetidas no salen en la galería visible, así que nunca viajan en el orden
   * pedido. Dejarlas fuera del resultado las haría desaparecer de un producto que sí las tiene.
   */
  it('conserva al final lo que no viene en la lista', () => {
    const orden = enEsteOrden([foto('a'), foto('v', 'video'), foto('b')], ['b', 'a']);

    expect(orden.map((i) => i.id)).toEqual(['b', 'a', 'v']);
  });

  it('mantiene entre sí el orden de las que no vienen', () => {
    const orden = enEsteOrden([foto('x'), foto('y'), foto('a')], ['a']);

    expect(orden.map((i) => i.id)).toEqual(['a', 'x', 'y']);
  });

  it('con la lista vacía no toca nada', () => {
    const orden = enEsteOrden([foto('a'), foto('b')], []);

    expect(orden.map((i) => i.id)).toEqual(['a', 'b']);
  });

  /** No muta la lista que recibe: la ficha que se está pintando no puede cambiar por debajo. */
  it('devuelve una lista nueva', () => {
    const original = [foto('a'), foto('b')];

    const orden = enEsteOrden(original, ['b', 'a']);

    expect(original.map((i) => i.id)).toEqual(['a', 'b']);
    expect(orden).not.toBe(original);
  });
});

describe('galería de detalle', () => {
  /**
   * Las fotos de la DESCRIPCIÓN son las largas que el proveedor monta debajo de la ficha —medidas,
   * materiales, cómo se lleva—. Si se colaran en el carrusel principal, el comprador vería carteles
   * en chino entre las fotos del producto. Por eso viajan con papel DETAIL y se pintan aparte, en su
   * propia galería horizontal dentro de la sección de detalle.
   */
  it('el carrusel principal no enseña las fotos de la descripción', () => {
    const fotos = [
      imagen('1', 'https://cdn/O1CN01portada.jpg', 'MAIN'),
      imagen('2', 'https://cdn/O1CN02galeria.jpg', 'GALLERY'),
      imagen('3', 'https://cdn/O1CN03detalle.jpg', 'DETAIL'),
    ];

    expect(galeriaVisible(fotos).map((f) => f.id)).toEqual(['1', '2']);
  });

  it('la galería de detalle enseña SOLO las de la descripción', () => {
    const fotos = [
      imagen('1', 'https://cdn/O1CN01portada.jpg', 'MAIN'),
      imagen('3', 'https://cdn/O1CN03detalle.jpg', 'DETAIL'),
      imagen('4', 'https://cdn/O1CN04detalle.jpg', 'detail'),
    ];

    expect(galeriaDeDetalle(fotos).map((f) => f.id)).toEqual(['3', '4']);
  });

  it('un producto sin fotos de descripción devuelve una galería vacía', () => {
    // Lo normal hoy: solo los productos cargados a partir del 12-sep-2026 las traen.
    const fotos = [imagen('1', 'https://cdn/O1CN01portada.jpg', 'MAIN')];

    expect(galeriaDeDetalle(fotos)).toEqual([]);
  });
});

describe('enEsteOrdenDentroDelGrupo', () => {
  const foto = (id: string, papel: string): ImagenDeProducto => ({
    id,
    direccion: `${id}.jpg`,
    posicion: 0,
    papel,
  });

  const MEZCLADAS = [
    foto('g1', 'MAIN'),
    foto('g2', 'GALLERY'),
    foto('d1', 'DETAIL'),
    foto('d2', 'DETAIL'),
    foto('d3', 'DETAIL'),
  ];

  /**
   * Lo que se rompería en producción si esta prueba fallara: arrastrar un cartel en la galería de la
   * descripción reordenaría la ficha ENTERA en pantalla —las seis fotos del detalle saltarían delante
   * de las ocho del carrusel— hasta que alguien recargase. Es lo que hace `enEsteOrden`, que sirve
   * para el carrusel justamente porque allí la lista sí es toda la galería.
   */
  it('permuta solo las nombradas y deja al resto en su sitio', () => {
    const orden = enEsteOrdenDentroDelGrupo(MEZCLADAS, ['d3', 'd1', 'd2']);

    expect(orden.map((i) => i.id)).toEqual(['g1', 'g2', 'd3', 'd1', 'd2']);
  });

  /**
   * Con una lista parcial se permutan SOLO las nombradas, entre los huecos que ya ocupaban; la que no
   * se nombra no se mueve. Es lo que hace falta para que reordenar un grupo no arrastre a quien no
   * participa en el gesto.
   */
  it('una lista parcial mueve solo a las nombradas', () => {
    const orden = enEsteOrdenDentroDelGrupo(MEZCLADAS, ['d3', 'd1']);

    expect(orden.map((i) => i.id)).toEqual(['g1', 'g2', 'd3', 'd2', 'd1']);
  });

  /** Sin nada que reordenar se devuelve lo mismo: ni se altera el orden ni se pierde ninguna. */
  it('con la lista vacía no cambia nada', () => {
    expect(enEsteOrdenDentroDelGrupo(MEZCLADAS, []).map((i) => i.id)).toEqual([
      'g1',
      'g2',
      'd1',
      'd2',
      'd3',
    ]);
  });
});
