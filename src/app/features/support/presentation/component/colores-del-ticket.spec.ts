import { describe, expect, it } from 'vitest';
import { colorDeClase, colorDeEstado, colorDePrioridad } from './colores-del-ticket';

describe('colores del ticket', () => {
  /** El backend manda unas veces mayúsculas y otras minúsculas: sin normalizar, media tabla fallaba. */
  it('encuentra el color venga el estado como venga escrito', () => {
    expect(colorDeEstado('OPEN')).toBe(colorDeEstado('open'));
    expect(colorDeEstado('RESOLVED')).toContain('success');
  });

  it('un estado que no conoce se pinta neutro en vez de quedarse sin etiqueta', () => {
    expect(colorDeEstado('ESCALATED')).toBe(colorDeEstado(''));
  });

  it('la prioridad urgente destaca y la normal no', () => {
    expect(colorDePrioridad('urgent')).toContain('error');
    expect(colorDePrioridad('normal')).not.toContain('error');
  });

  it('una reclamación se distingue de una consulta a simple vista', () => {
    expect(colorDeClase('DISPUTE')).not.toBe(colorDeClase('SUPPORT'));
  });
});
