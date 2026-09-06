import { Divisa } from './dinero';
import {
  IdiomaDeTienda, bloqueanLaActivacion, divisaCoincide, ordenaIdiomas, sinDiccionarioDeInterfaz,
  sinTasa, ultimaSincronizacion,
} from './sistema';

function divisa(cambios: Partial<Divisa> = {}): Divisa {
  return { codigo: 'EUR', nombre: 'Euro', simbolo: '€', tasaVsUsd: 0.92, activa: true, ...cambios };
}

describe('ordenaIdiomas', () => {
  it('respeta la posición que decidió quien administra, no el orden de llegada', () => {
    const idiomas: readonly IdiomaDeTienda[] = [
      { id: '2', codigo: 'en', etiqueta: 'English', posicion: 1, activo: true, porDefecto: false },
      { id: '1', codigo: 'es', etiqueta: 'Español', posicion: 0, activo: true, porDefecto: true },
    ];

    expect(ordenaIdiomas(idiomas).map((i) => i.codigo)).toEqual(['es', 'en']);
  });

  it('no toca la lista original', () => {
    const idiomas: readonly IdiomaDeTienda[] = [
      { id: '2', codigo: 'en', etiqueta: 'English', posicion: 1, activo: true, porDefecto: false },
      { id: '1', codigo: 'es', etiqueta: 'Español', posicion: 0, activo: true, porDefecto: true },
    ];

    ordenaIdiomas(idiomas);

    expect(idiomas[0].codigo).toBe('en');
  });
});

describe('sinDiccionarioDeInterfaz', () => {
  /**
   * Un idioma sin diccionario NO deja la tienda vacía: la ficha se ve traducida y el menú, el carrito y
   * el pago en inglés. Ese mestizaje es lo que hay que avisar antes de publicarlo.
   */
  it('señala los que no tienen textos de interfaz', () => {
    expect(sinDiccionarioDeInterfaz(['es', 'ja', 'ar'], ['es', 'en', 'pt'])).toEqual(['ja', 'ar']);
  });

  it('sin ninguno que avisar devuelve la lista vacía', () => {
    expect(sinDiccionarioDeInterfaz(['es'], ['es', 'en'])).toEqual([]);
  });
});

describe('sinTasa', () => {
  /**
   * Con la tasa a cero el importe se queda sin convertir y el comprador ve el número en dólares con el
   * símbolo de su moneda: la tienda anunciaría un precio que no es el que se cobra.
   */
  it('una divisa sin tipo de cambio no se puede publicar', () => {
    expect(sinTasa(divisa({ tasaVsUsd: 0 }))).toBe(true);
    expect(sinTasa(divisa({ tasaVsUsd: -1 }))).toBe(true);
    expect(sinTasa(divisa())).toBe(false);
  });
});

describe('bloqueanLaActivacion', () => {
  const registro = [divisa({ codigo: 'EUR' }), divisa({ codigo: 'COP', tasaVsUsd: 0 })];

  it('devuelve las divisas de la selección que no tienen tasa', () => {
    expect(bloqueanLaActivacion(['EUR', 'COP'], registro)).toEqual(['COP']);
  });

  it('no bloquea cuando todas tienen tasa', () => {
    expect(bloqueanLaActivacion(['EUR'], registro)).toEqual([]);
  });
});

describe('divisaCoincide', () => {
  const euro = divisa();

  it('filtra por estado', () => {
    expect(divisaCoincide(euro, '', 'active')).toBe(true);
    expect(divisaCoincide(euro, '', 'inactive')).toBe(false);
    expect(divisaCoincide(divisa({ activa: false }), '', 'inactive')).toBe(true);
  });

  it('busca en el código y en el nombre sin distinguir mayúsculas', () => {
    expect(divisaCoincide(euro, 'eur', null)).toBe(true);
    expect(divisaCoincide(euro, 'Euro', null)).toBe(true);
    expect(divisaCoincide(euro, 'dólar', null)).toBe(false);
  });

  it('sin nada escrito, todo coincide', () => {
    expect(divisaCoincide(euro, '  ', null)).toBe(true);
  });
});

describe('ultimaSincronizacion', () => {
  it('devuelve la fecha más reciente del registro', () => {
    const registro = [
      divisa({ codigo: 'A', sincronizadaEl: '2026-03-01T00:00:00Z' }),
      divisa({ codigo: 'B', sincronizadaEl: '2026-03-05T00:00:00Z' }),
      divisa({ codigo: 'C' }),
    ];

    expect(ultimaSincronizacion(registro)).toBe('2026-03-05T00:00:00Z');
  });

  it('sin ninguna sincronización devuelve indefinido', () => {
    expect(ultimaSincronizacion([divisa()])).toBeUndefined();
  });
});
