import { describe, expect, it } from 'vitest';
import {
  HitoDeSeguimiento,
  Seguimiento,
  claveDeFase,
  claveDeRespaldoDelHito,
  enlaceSeguro,
  estaEntregado,
  faseConProblema,
  faseConocida,
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

  describe('fases del envío', () => {
    const envio = (parcial: Partial<Seguimiento>): Seguimiento => ({
      hitos: [],
      bultos: [],
      ...parcial,
    });

    it('solo reconoce las fases del contrato; lo demás es ausente', () => {
      expect(faseConocida('EN_ADUANA')).toBe('EN_ADUANA');
      expect(faseConocida('INVENTADA')).toBeUndefined();
      expect(faseConocida(null)).toBeUndefined();
      expect(faseConocida(undefined)).toBeUndefined();
    });

    it('la clave de traducción cuelga de tracking.phase', () => {
      expect(claveDeFase('EN_REPARTO')).toBe('tracking.phase.EN_REPARTO');
    });

    it('incidencia y devolución son las fases con problema', () => {
      expect(faseConProblema('INCIDENCIA')).toBe(true);
      expect(faseConProblema('DEVUELTO')).toBe(true);
      expect(faseConProblema('EN_TRANSITO')).toBe(false);
      expect(faseConProblema(undefined)).toBe(false);
    });

    it('un enlace solo vale si es http o https', () => {
      expect(enlaceSeguro('https://t.4px.com/x?n=1')).toBe('https://t.4px.com/x?n=1');
      expect(enlaceSeguro('http://t.example/x')).toBe('http://t.example/x');
      expect(enlaceSeguro('javascript:alert(1)')).toBeUndefined();
      expect(enlaceSeguro('data:text/html,hola')).toBeUndefined();
      expect(enlaceSeguro('no es una url')).toBeUndefined();
      expect(enlaceSeguro('')).toBeUndefined();
      expect(enlaceSeguro(undefined)).toBeUndefined();
    });

    it('está entregado cuando la fase del pedido lo dice', () => {
      expect(estaEntregado(envio({ fase: 'ENTREGADO' }))).toBe(true);
    });

    it('está entregado cuando TODOS los bultos lo están, y no si falta uno', () => {
      const bulto = (fase: 'ENTREGADO' | 'EN_TRANSITO') => ({
        secuencia: 1,
        pesoGramos: 0,
        fase,
        hitos: [],
        contenido: [],
      });
      expect(estaEntregado(envio({ bultos: [bulto('ENTREGADO'), bulto('ENTREGADO')] }))).toBe(true);
      expect(estaEntregado(envio({ bultos: [bulto('ENTREGADO'), bulto('EN_TRANSITO')] }))).toBe(
        false,
      );
    });

    it('sin seguimiento, sin fase o sin bultos no está entregado', () => {
      expect(estaEntregado(null)).toBe(false);
      expect(estaEntregado(envio({}))).toBe(false);
      expect(estaEntregado(envio({ fase: 'EN_TRANSITO' }))).toBe(false);
    });

    it('un hito sin descripción se cuenta con su fase y, sin ella, con el estado', () => {
      expect(claveDeRespaldoDelHito(hito({ fase: 'EN_ADUANA' }))).toBe('tracking.phase.EN_ADUANA');
      expect(claveDeRespaldoDelHito(hito({ estado: 'DELIVERED' }))).toBe('orders.status.DELIVERED');
    });
  });
});
