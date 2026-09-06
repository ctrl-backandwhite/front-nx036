import { describe, expect, it } from 'vitest';
import {
  HitoDeSeguimiento,
  esElMismoHito,
  normalizaDescripcion,
  pasosDelEnvio,
  tieneAlgoQueContar,
} from './seguimiento';

const hito = (parcial: Partial<HitoDeSeguimiento>): HitoDeSeguimiento => ({
  estado: 'SHIPPED',
  ...parcial,
});

describe('seguimiento del envío', () => {
  describe('normalizaDescripcion', () => {
    it('quita mayúsculas, tildes y puntuación', () => {
      expect(normalizaDescripcion('  Paquete Recogido, por el transportista.  ')).toBe(
        'paquete recogido por el transportista',
      );
    });

    it('sin texto devuelve cadena vacía', () => {
      expect(normalizaDescripcion(undefined)).toBe('');
    });
  });

  describe('esElMismoHito', () => {
    it('no colapsa dos estados distintos aunque digan lo mismo', () => {
      expect(
        esElMismoHito(hito({ estado: 'SHIPPED', descripcion: 'En tránsito' }), hito({ estado: 'DELIVERED', descripcion: 'En tránsito' })),
      ).toBe(false);
    });

    it('una descripción contenida en la otra es el mismo hecho', () => {
      expect(
        esElMismoHito(
          hito({ descripcion: 'Paquete recogido por el transportista' }),
          hito({ descripcion: 'Recogido por el transportista' }),
        ),
      ).toBe(true);
    });

    /** Con espacios alrededor: «transito» no debe casar con «transitorio». */
    it('compara palabras enteras, no trozos de palabra', () => {
      expect(
        esElMismoHito(hito({ descripcion: 'transito' }), hito({ descripcion: 'transitorio' })),
      ).toBe(false);
    });

    it('sin descripciones, basta con que coincida el estado', () => {
      expect(esElMismoHito(hito({}), hito({}))).toBe(true);
      expect(esElMismoHito(hito({ descripcion: 'Algo' }), hito({}))).toBe(false);
    });
  });

  describe('pasosDelEnvio', () => {
    it('sin pasos devuelve una lista vacía', () => {
      expect(pasosDelEnvio()).toEqual([]);
    });

    it('quita los repetidos y deja lo más reciente arriba', () => {
      const pasos = pasosDelEnvio([
        hito({ descripcion: 'Recogido por el transportista', ocurridoEl: '2026-09-01T08:00:00Z' }),
        hito({ descripcion: 'Paquete recogido por el transportista', ubicacion: 'ES' }),
        hito({ estado: 'DELIVERED', descripcion: 'Entregado', ocurridoEl: '2026-09-05T09:00:00Z' }),
      ]);

      expect(pasos).toHaveLength(2);
      expect(pasos[0].descripcion).toBe('Entregado');
    });

    /**
     * Se conserva la hora del PRIMER aviso —la del hecho, la que acaba en una reclamación— y se
     * completan con el repetido los huecos que traiga.
     */
    it('conserva la primera hora y rellena los huecos con el repetido', () => {
      const [paso] = pasosDelEnvio([
        hito({ descripcion: 'Recogido', ocurridoEl: '2026-09-01T08:00:00Z' }),
        hito({ descripcion: 'Paquete recogido', ubicacion: 'Utrecht, NL' }),
      ]);

      expect(paso.ocurridoEl).toBe('2026-09-01T08:00:00Z');
      expect(paso.ubicacion).toBe('Utrecht, NL');
    });
  });

  describe('tieneAlgoQueContar', () => {
    it('sin guía, sin pasos y sin bultos no hay sección que pintar', () => {
      expect(tieneAlgoQueContar({ hitos: [], bultos: [] })).toBe(false);
    });

    it('basta con la guía', () => {
      expect(tieneAlgoQueContar({ numeroDeSeguimiento: 'LP1', hitos: [], bultos: [] })).toBe(true);
    });

    it('o con un bulto', () => {
      expect(
        tieneAlgoQueContar({
          hitos: [],
          bultos: [{ secuencia: 1, pesoGramos: 0, hitos: [], contenido: [] }],
        }),
      ).toBe(true);
    });
  });
});
