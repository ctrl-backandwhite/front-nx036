import { analizaJson } from './analisis-de-json';
import { motivoDelFallo } from './fallo-de-lote';
import { BYTES_POR_LOTE, lotes, tieneAlgunTitulo, validaFilas } from './importacion-masiva';
import { creaError } from '@shared/error/app-error';

describe('importacion-masiva', () => {
  describe('tieneAlgunTitulo', () => {
    /** Exigir el español bloqueaba reimportar un producto exportado sin traducción española. */
    it('vale el título de cualquier idioma fijo', () => {
      expect(tieneAlgunTitulo({ titleEn: 'Headset' })).toBe(true);
    });

    it('vale también el título de dentro de las traducciones', () => {
      expect(tieneAlgunTitulo({ translations: { fr: { title: 'Casque' } } })).toBe(true);
    });

    it('un título en blanco no cuenta', () => {
      expect(tieneAlgunTitulo({ titleEs: '   ' })).toBe(false);
      expect(tieneAlgunTitulo({ translations: { fr: { title: '' } } })).toBe(false);
      expect(tieneAlgunTitulo({})).toBe(false);
    });
  });

  describe('validaFilas', () => {
    const valida = { titleEs: 'Auricular', shippingCny: 8, ivaCny: 0 };

    it('una lista vacía es un problema en sí', () => {
      expect(validaFilas([], 'products')).toEqual([
        { fila: 0, clave: 'admin.catalog.bulk.empty' },
      ]);
    });

    it('una fila correcta no da problemas', () => {
      expect(validaFilas([valida], 'products')).toEqual([]);
    });

    it('avisa de los campos obligatorios que el backend exige', () => {
      const problemas = validaFilas([{ titleEs: 'Auricular' }], 'products');
      expect(problemas).toContainEqual({
        fila: 1,
        clave: 'admin.catalog.bulk.err_required',
        campo: 'shippingCny',
      });
    });

    it('avisa del título ausente con su número de fila', () => {
      const problemas = validaFilas([valida, { shippingCny: 1, ivaCny: 0 }], 'products');
      expect(problemas).toContainEqual({ fila: 2, clave: 'admin.catalog.bulk.err_no_title' });
    });

    it('comprueba los tipos: número, entero, lista y mapa', () => {
      const problemas = validaFilas(
        [{ ...valida, price: 'caro', moq: 1.5, imageUrls: 'no-es-lista', translations: [] }],
        'products',
      );
      const claves = problemas.map((p) => `${p.campo}:${p.clave}`);
      expect(claves).toContain('price:admin.catalog.bulk.err_number');
      expect(claves).toContain('moq:admin.catalog.bulk.err_integer');
      expect(claves).toContain('imageUrls:admin.catalog.bulk.err_array');
      expect(claves).toContain('translations:admin.catalog.bulk.err_array');
    });

    it('lo que no es un objeto se rechaza entero', () => {
      expect(validaFilas([[1, 2]], 'categories')).toEqual([
        { fila: 1, clave: 'admin.catalog.bulk.err_object' },
      ]);
    });

    it('las categorías tienen sus propios obligatorios', () => {
      const problemas = validaFilas([{ slug: 'ropa' }], 'categories');
      expect(problemas).toEqual([
        { fila: 1, clave: 'admin.catalog.bulk.err_required', campo: 'nameEs' },
      ]);
    });
  });

  describe('lotes', () => {
    it('cierra el lote al llegar al número de filas', () => {
      const partido = lotes([1, 2, 3, 4, 5], 2, BYTES_POR_LOTE);
      expect(partido.map((l) => [l.desde, l.hasta])).toEqual([
        [1, 2],
        [3, 4],
        [5, 5],
      ]);
    });

    /**
     * El TAMAÑO manda sobre el número: lo que rechaza el proxy son bytes, y un lote contado solo por
     * filas se caía entero con un 413 mudo.
     */
    it('cierra el lote por bytes aunque quepan más filas', () => {
      const gorda = { texto: 'x'.repeat(50) };
      const partido = lotes([gorda, gorda, gorda], 100, 80);
      expect(partido.length).toBe(3);
    });

    it('una fila que por sí sola pasa del tope viaja igualmente sola', () => {
      const enorme = { texto: 'x'.repeat(500) };
      const partido = lotes([enorme], 100, 10);
      expect(partido).toEqual([{ filas: [enorme], desde: 1, hasta: 1 }]);
    });

    it('sin filas no hay lotes', () => {
      expect(lotes([], 10, 100)).toEqual([]);
    });
  });

  describe('analizaJson', () => {
    it('sin texto no dice nada', () => {
      expect(analizaJson('   ', 'products').clase).toBe('vacio');
    });

    it('un JSON mal formado se localiza por línea y columna', () => {
      const analisis = analizaJson('[\n  { "a": 1, }\n]', 'products');
      expect(analisis.clase).toBe('sintaxis');
      if (analisis.clase === 'sintaxis') {
        expect(analisis.linea).toBeGreaterThan(0);
      }
    });

    it('un objeto suelto no es una lista de filas', () => {
      expect(analizaJson('{"titleEs":"x"}', 'products').clase).toBe('no-es-lista');
    });

    it('una lista con problemas los enumera sin dejar de contar las filas', () => {
      const analisis = analizaJson('[{"titleEs":"x"}]', 'products');
      expect(analisis.clase).toBe('invalido');
      if (analisis.clase === 'invalido') {
        expect(analisis.filas).toBe(1);
        expect(analisis.problemas.length).toBeGreaterThan(0);
      }
    });

    it('una lista correcta devuelve las filas listas para mandar', () => {
      const analisis = analizaJson('[{"titleEs":"x","shippingCny":1,"ivaCny":0}]', 'products');
      expect(analisis.clase).toBe('valido');
      if (analisis.clase === 'valido') {
        expect(analisis.lista.length).toBe(1);
      }
    });
  });

  describe('motivoDelFallo', () => {
    /** El 413 es el caso importante: el lote nunca llegó, así que no hay error por fila que mirar. */
    it('distingue el lote demasiado grande', () => {
      expect(motivoDelFallo(creaError('desconocido', '', { estado: 413 })).clave).toBe(
        'admin.catalog.bulk.err_too_large',
      );
    });

    it('distingue la sesión perdida', () => {
      expect(motivoDelFallo(creaError('no-autenticado')).clave).toBe(
        'admin.catalog.bulk.err_session',
      );
      expect(motivoDelFallo(creaError('sin-permiso')).clave).toBe(
        'admin.catalog.bulk.err_session',
      );
    });

    it('deja pasar el mensaje que redactó el backend', () => {
      const motivo = motivoDelFallo(creaError('conflicto', 'Ya existe ese identificador'));
      expect(motivo.mensaje).toBe('Ya existe ese identificador');
    });

    it('sin mensaje se cae al texto genérico', () => {
      expect(motivoDelFallo(creaError('sin-conexion')).mensaje).toBeUndefined();
    });
  });
});
