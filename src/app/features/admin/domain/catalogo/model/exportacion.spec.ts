import {
  nombreDeArchivo,
  nombreDeArchivoCompleto,
  nombreDeArchivoDeCategorias,
  segmentos,
  tamanoDelSegmento,
} from './exportacion';

describe('exportacion', () => {
  describe('segmentos', () => {
    it('parte el total en tramos de base uno', () => {
      expect(segmentos(2500, 1000)).toEqual([
        { desde: 1, hasta: 1000 },
        { desde: 1001, hasta: 2000 },
        { desde: 2001, hasta: 2500 },
      ]);
    });

    it('sin productos no se ofrece ningún tramo', () => {
      expect(segmentos(0, 1000)).toEqual([]);
    });

    /** Un tamaño absurdo no puede dejar el bucle sin avanzar. */
    it('un tamaño inválido cae a uno', () => {
      expect(segmentos(2, 0)).toEqual([
        { desde: 1, hasta: 1 },
        { desde: 2, hasta: 2 },
      ]);
    });
  });

  it('el tramo dice cuántos productos trae', () => {
    expect(tamanoDelSegmento({ desde: 1001, hasta: 2000 })).toBe(1000);
  });

  it('los nombres de archivo llevan el tramo y la fecha, para que dos descargas no se pisen', () => {
    const hoy = new Date('2026-09-06T10:00:00Z');
    expect(nombreDeArchivo({ desde: 1, hasta: 1000 }, hoy)).toBe('productos_1-1000_2026-09-06.json');
    expect(nombreDeArchivoCompleto(hoy)).toBe('productos_todos_2026-09-06.ndjson');
    expect(nombreDeArchivoDeCategorias(hoy)).toBe('categorias-2026-09-06.json');
  });
});
