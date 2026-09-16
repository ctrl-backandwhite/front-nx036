import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { FormatoDeFecha } from './formato-de-fecha';
import { TraduccionService } from './traduccion.service';

/**
 * Las fechas se pintan en el idioma ELEGIDO, no en el del navegador.
 *
 * <p>Lo que se rompía en producción: estaba escrito a mano en 33 sitios como `toLocaleString()` sin
 * argumento, y sin argumento esa función usa el idioma del NAVEGADOR. Una aplicación con ocho
 * diccionarios, cuya cabecera `X-Lang` decide hasta el texto de los errores del servidor, pintaba las
 * fechas en un noveno idioma que nadie había elegido: «9/16/2026, 6:21 PM» al lado de un texto en
 * español.
 *
 * <p>Se afirma sobre el ORDEN de los números y no sobre la cadena entera: el separador y el formato de
 * la hora los decide la biblioteca de internacionalización del entorno y cambian entre versiones de
 * Node. Lo que distingue un idioma de otro —y es lo que aquí importa— es que el español ponga el día
 * delante y el inglés el mes.
 */
describe('FormatoDeFecha', () => {
  function conIdioma(idioma: string): FormatoDeFecha {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: TraduccionService, useValue: { idioma: signal(idioma) } }],
    });
    return TestBed.inject(FormatoDeFecha);
  }

  const NOCHEVIEJA = '2026-12-31T22:45:00Z';

  it('en español el día va delante del mes', () => {
    const texto = conIdioma('es').fechaYHora(NOCHEVIEJA);

    expect(texto).toMatch(/\b31\b/);
    expect(texto.indexOf('31')).toBeLessThan(texto.indexOf('12'));
  });

  it('en inglés el mes va delante del día', () => {
    const texto = conIdioma('en').fechaYHora(NOCHEVIEJA);

    expect(texto).toMatch(/\b31\b/);
    expect(texto.indexOf('12')).toBeLessThan(texto.indexOf('31'));
  });

  it('el mismo instante se pinta distinto en dos idiomas', () => {
    // La comprobación central: si el idioma no llegara al formateador, las dos serían idénticas, que es
    // exactamente lo que pasaba con `toLocaleString()` sin argumento.
    expect(conIdioma('es').fechaYHora(NOCHEVIEJA)).not.toBe(conIdioma('en').fechaYHora(NOCHEVIEJA));
  });

  it('solo la fecha no lleva hora', () => {
    const soloFecha = conIdioma('es').soloFecha(NOCHEVIEJA);

    expect(soloFecha).toMatch(/\b31\b/);
    expect(soloFecha).not.toMatch(/\d{1,2}:\d{2}/);
  });

  it('sin dato devuelve cadena vacía, no «Invalid Date»', () => {
    const formato = conIdioma('es');

    // Es lo que impide que un listado con una fecha ausente pinte «Invalid Date» en la celda.
    expect(formato.fechaYHora(null)).toBe('');
    expect(formato.fechaYHora(undefined)).toBe('');
    expect(formato.fechaYHora('')).toBe('');
    expect(formato.soloFecha(null)).toBe('');
  });

  it('una fecha que no se entiende devuelve cadena vacía', () => {
    const formato = conIdioma('es');

    expect(formato.fechaYHora('no es una fecha')).toBe('');
    expect(formato.soloFecha('2026-13-45')).toBe('');
  });

  it('cambiar de idioma cambia lo que se pinta sin reconstruir el servicio', () => {
    // El formateador se memoriza por idioma para no reconstruir un `Intl.DateTimeFormat` por fila de
    // listado. Memorizar mal dejaría la primera fecha congelada en el idioma inicial.
    const idioma = signal('es');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: TraduccionService, useValue: { idioma } }],
    });
    const formato = TestBed.inject(FormatoDeFecha);

    const enEspanol = formato.fechaYHora(NOCHEVIEJA);
    idioma.set('en');

    expect(formato.fechaYHora(NOCHEVIEJA)).not.toBe(enEspanol);
  });
});
