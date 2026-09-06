import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PaseDeGaleria } from './pase-de-galeria';

/** El pase mira si el sistema pide reducir el movimiento; jsdom no trae `matchMedia`. */
function fingeMatchMedia(reducido: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (consulta: string) => ({
      matches: reducido,
      media: consulta,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  });
}

describe('PaseDeGaleria', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fingeMatchMedia(false);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [PaseDeGaleria] });
  });

  afterEach(() => vi.useRealTimers());

  /** Da UNA vuelta y termina volviendo a la primera, donde se queda. */
  it('recorre las fotos y vuelve al principio', () => {
    const pase = TestBed.inject(PaseDeGaleria);
    const vistas: number[] = [];
    pase.arranca(3, (i) => vistas.push(i));
    expect(pase.corriendo()).toBe(true);
    vi.advanceTimersByTime(30_000);
    expect(vistas).toEqual([1, 2, 0]);
    expect(pase.corriendo()).toBe(false);
  });

  /** Quien está mirando una foto concreta manda sobre la animación: no se reanuda. */
  it('cancelar lo detiene para siempre', () => {
    const pase = TestBed.inject(PaseDeGaleria);
    const vistas: number[] = [];
    pase.arranca(5, (i) => vistas.push(i));
    // Justo después del primer salto y antes del segundo.
    vi.advanceTimersByTime(2000);
    pase.cancela();
    vi.advanceTimersByTime(60_000);
    expect(vistas).toEqual([1]);
    expect(pase.corriendo()).toBe(false);
  });

  it('con una sola foto no arranca: cambiarla por sí misma es un parpadeo', () => {
    const pase = TestBed.inject(PaseDeGaleria);
    const avanza = vi.fn();
    pase.arranca(1, avanza);
    vi.advanceTimersByTime(30_000);
    expect(avanza).not.toHaveBeenCalled();
    expect(pase.corriendo()).toBe(false);
  });

  /** Hay gente a la que el movimiento automático le provoca mareo: no es una cortesía. */
  it('no arranca si el sistema pide reducir el movimiento', () => {
    fingeMatchMedia(true);
    const pase = TestBed.inject(PaseDeGaleria);
    const avanza = vi.fn();
    pase.arranca(6, avanza);
    vi.advanceTimersByTime(30_000);
    expect(avanza).not.toHaveBeenCalled();
  });

  it('cada producto estrena su pase', () => {
    const pase = TestBed.inject(PaseDeGaleria);
    const primero: number[] = [];
    pase.arranca(4, (i) => primero.push(i));
    vi.advanceTimersByTime(1000);
    const segundo: number[] = [];
    pase.arranca(4, (i) => segundo.push(i));
    vi.advanceTimersByTime(30_000);
    expect(primero).toEqual([1]);
    expect(segundo).toEqual([1, 2, 3, 0]);
  });
});
