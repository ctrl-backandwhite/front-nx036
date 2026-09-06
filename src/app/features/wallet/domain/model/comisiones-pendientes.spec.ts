import { describe, expect, it } from 'vitest';
import { esperaHastaLaAprobacion } from './comisiones-pendientes';

const AHORA = Date.parse('2026-09-06T12:00:00Z');

describe('esperaHastaLaAprobacion', () => {
  it('sin fecha no hay nada que contar', () => {
    expect(esperaHastaLaAprobacion(null, AHORA)).toEqual({ clase: 'sin-fecha' });
    expect(esperaHastaLaAprobacion(undefined, AHORA)).toEqual({ clase: 'sin-fecha' });
  });

  /** La aprobación la ejecuta un proceso periódico: pasado el plazo se dice «inminente», no «-3 h». */
  it('con el plazo vencido dice que es inminente', () => {
    expect(esperaHastaLaAprobacion('2026-09-06T11:00:00Z', AHORA)).toEqual({ clase: 'inminente' });
    expect(esperaHastaLaAprobacion('2026-09-06T12:00:00Z', AHORA)).toEqual({ clase: 'inminente' });
  });

  it('el último día se cuenta en horas', () => {
    expect(esperaHastaLaAprobacion('2026-09-07T06:00:00Z', AHORA)).toEqual({
      clase: 'horas',
      cuantas: 18,
    });
  });

  /** «Faltan 27 horas» no se lee tan rápido como «faltan 2 días». */
  it('más de un día se cuenta en días', () => {
    expect(esperaHastaLaAprobacion('2026-09-09T12:00:00Z', AHORA)).toEqual({
      clase: 'dias',
      cuantos: 3,
    });
  });

  it('una fecha ilegible se trata como inminente en vez de romper la lista', () => {
    expect(esperaHastaLaAprobacion('no es una fecha', AHORA)).toEqual({ clase: 'inminente' });
  });
});
