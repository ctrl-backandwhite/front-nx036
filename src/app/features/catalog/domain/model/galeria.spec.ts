import { describe, expect, it } from 'vitest';
import { ImagenDeProducto } from './producto';
import {
  MAXIMO_DE_FOTOS_DEL_PASE,
  claveDeImagen,
  estaEnLaGaleria,
  fotoParaCompartir,
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
