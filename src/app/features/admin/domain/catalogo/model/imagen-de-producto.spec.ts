import {
  ImagenDeProducto,
  claveDeImagen,
  direccionDeImagen,
  extraeDirecciones,
  mueve,
  yaEnLaGaleria,
} from './imagen-de-producto';

const imagen = (id: string, urlCdn?: string, urlOrigen = ''): ImagenDeProducto => ({
  id,
  urlOrigen,
  urlCdn,
  posicion: 0,
  papel: 'GALLERY',
});

describe('imagen-de-producto', () => {
  it('pinta la del CDN si la hay, y si no la de origen', () => {
    expect(direccionDeImagen(imagen('1', 'https://cdn/a.jpg', 'https://origen/a.jpg'))).toBe(
      'https://cdn/a.jpg',
    );
    expect(direccionDeImagen(imagen('2', undefined, 'https://origen/b.jpg'))).toBe(
      'https://origen/b.jpg',
    );
  });

  describe('claveDeImagen', () => {
    /** El mismo archivo llega con direcciones distintas según el CDN y el tamaño; el O1CN no cambia. */
    it('dos direcciones del mismo archivo comparten identidad por su O1CN', () => {
      expect(claveDeImagen('https://cdn.x/O1CN01abcXYZ_!!600.jpg')).toBe('O1CN01abcXYZ');
      expect(claveDeImagen('https://otro.cdn/O1CN01abcXYZ_!!800.jpg')).toBe('O1CN01abcXYZ');
    });

    it('sin O1CN cae a la dirección sin la parte de consulta', () => {
      expect(claveDeImagen('https://X/Foto.JPG?w=800')).toBe('https://x/foto.jpg');
    });

    it('sin dirección no hay identidad', () => {
      expect(claveDeImagen(undefined)).toBe('');
      expect(claveDeImagen(null)).toBe('');
    });
  });

  it('reconoce que una foto ya está en la galería aunque cambie el tamaño', () => {
    const galeria = [imagen('1', 'https://cdn/O1CN0999_!!600.jpg')];
    expect(yaEnLaGaleria(galeria, 'https://otro/O1CN0999_!!100.jpg')).toBe(true);
    expect(yaEnLaGaleria(galeria, 'https://otro/O1CN1111_!!100.jpg')).toBe(false);
  });

  describe('extraeDirecciones', () => {
    it('lee una por línea, por comas o por espacios, y descarta lo que no es dirección', () => {
      const texto = 'https://a/1.jpg\n https://b/2.jpg, no-es-url  https://c/3.jpg';
      expect(extraeDirecciones(texto)).toEqual([
        'https://a/1.jpg',
        'https://b/2.jpg',
        'https://c/3.jpg',
      ]);
    });

    /** Pegar la lista de la ficha de origen trae repetidos, y cada repetido sería otra fila. */
    it('deduplica', () => {
      expect(extraeDirecciones('https://a/1.jpg https://a/1.jpg')).toEqual(['https://a/1.jpg']);
    });
  });

  describe('mueve', () => {
    it('mueve un elemento a otra posición sin tocar el original', () => {
      const lista = ['a', 'b', 'c'];
      expect(mueve(lista, 2, 0)).toEqual(['c', 'a', 'b']);
      expect(lista).toEqual(['a', 'b', 'c']);
    });

    it('un movimiento imposible devuelve la misma lista', () => {
      const lista = ['a', 'b'];
      expect(mueve(lista, 1, 1)).toBe(lista);
      expect(mueve(lista, -1, 0)).toBe(lista);
      expect(mueve(lista, 0, 9)).toBe(lista);
    });
  });
});
