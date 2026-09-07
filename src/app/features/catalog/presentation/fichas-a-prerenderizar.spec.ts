import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FICHAS_POR_DEFECTO,
  LectorDeApi,
  VARIABLE_CUANTAS_FICHAS,
  cuantasFichas,
  eligeLasFichas,
  slugsAPrerenderizar,
} from './fichas-a-prerenderizar';

/** Una portada con las secciones que pidas, cada una con sus `slug`. */
function portada(...secciones: string[][]): unknown {
  return { sections: secciones.map((slugs) => ({ items: slugs.map((slug) => ({ slug })) })) };
}

/** Una página de más vendidos. */
function pagina(...slugs: string[]): unknown {
  return { items: slugs.map((slug) => ({ slug })) };
}

/**
 * Un lector de mentira que responde según el camino pedido, y anota qué le han pedido.
 *
 * <p>Las páginas de más vendidos se sirven de la lista `masVendidos`, cien a cien, para poder
 * comprobar que se pagina de verdad y que se para donde tiene que parar.
 */
function lector(opciones: { portada?: unknown; masVendidos?: string[]; falla?: string }): {
  lee: LectorDeApi;
  caminos: string[];
} {
  const caminos: string[] = [];
  const lee: LectorDeApi = (camino) => {
    caminos.push(camino);
    if (opciones.falla && camino.includes(opciones.falla)) {
      return Promise.reject(new Error('el backend no contesta'));
    }
    if (camino.includes('/home/sections')) {
      return Promise.resolve(opciones.portada ?? portada());
    }
    const numero = Number(/page=(\d+)/.exec(camino)?.[1] ?? 0);
    const lote = (opciones.masVendidos ?? []).slice(numero * 100, numero * 100 + 100);
    return Promise.resolve(pagina(...lote));
  };
  return { lee, caminos };
}

/** Genera `cuantos` slugs distintos, para llenar páginas sin escribirlas a mano. */
function muchos(cuantos: number, prefijo = 'v'): string[] {
  return Array.from({ length: cuantos }, (_, i) => `${prefijo}${i}`);
}

describe('cuántas fichas se prerenderizan', () => {
  it('sin variable declarada usa el valor por defecto', () => {
    expect(cuantasFichas({})).toBe(FICHAS_POR_DEFECTO);
    expect(cuantasFichas({ [VARIABLE_CUANTAS_FICHAS]: '   ' })).toBe(FICHAS_POR_DEFECTO);
  });

  it('respeta el número que ponga el titular', () => {
    expect(cuantasFichas({ [VARIABLE_CUANTAS_FICHAS]: '500' })).toBe(500);
    expect(cuantasFichas({ [VARIABLE_CUANTAS_FICHAS]: ' 42 ' })).toBe(42);
  });

  /** Cero es la marcha atrás: se compila sin ninguna ficha, como antes de este cambio. */
  it('admite el cero como marcha atrás', () => {
    expect(cuantasFichas({ [VARIABLE_CUANTAS_FICHAS]: '0' })).toBe(0);
  });

  /**
   * Un valor con una letra de más se convertiría en `NaN` y la compilación se quedaría sin ninguna
   * ficha SIN decir por qué. Se avisa y se sigue con el valor de por defecto.
   */
  it('avisa y usa el valor por defecto ante un valor que no es un entero no negativo', () => {
    for (const malo of ['trescientos', '30x', '2.5', '-1', 'Infinity']) {
      const avisos: string[] = [];
      expect(
        cuantasFichas({ [VARIABLE_CUANTAS_FICHAS]: malo }, (m) => avisos.push(m)),
        malo,
      ).toBe(FICHAS_POR_DEFECTO);
      expect(avisos, malo).toHaveLength(1);
      expect(avisos[0]).toContain(VARIABLE_CUANTAS_FICHAS);
    }
  });
});

describe('elección del subconjunto', () => {
  /** Son las que ve quien llega de fuera sin cuenta: las que más se abren y más se comparten. */
  it('las de la portada van primero', async () => {
    const { lee } = lector({ portada: portada(['a', 'b'], ['c']), masVendidos: ['x', 'y'] });

    await expect(eligeLasFichas(lee, 5)).resolves.toEqual(['a', 'b', 'c', 'x', 'y']);
  });

  /** La portada trae una sección de más vendidos: sin quitar repetidos el cupo se gastaría dos veces. */
  it('no repite una ficha que salga en las dos fuentes', async () => {
    const { lee } = lector({ portada: portada(['a', 'b'], ['b', 'c']), masVendidos: ['c', 'd'] });

    await expect(eligeLasFichas(lee, 10)).resolves.toEqual(['a', 'b', 'c', 'd']);
  });

  it('no devuelve más de las que caben en el cupo', async () => {
    const { lee } = lector({ portada: portada(['a', 'b', 'c']), masVendidos: ['d', 'e'] });

    await expect(eligeLasFichas(lee, 2)).resolves.toEqual(['a', 'b']);
  });

  /** El backend recorta `size` a 100, así que hay que ir a por más de una página. */
  it('pagina las más vendidas hasta llenar el cupo', async () => {
    const { lee, caminos } = lector({ masVendidos: muchos(250) });

    const elegidas = await eligeLasFichas(lee, 220);

    expect(elegidas).toHaveLength(220);
    expect(elegidas[0]).toBe('v0');
    expect(elegidas[219]).toBe('v219');
    expect(caminos.filter((c) => c.includes('bestsellers'))).toEqual([
      '/api/catalog/bestsellers?lang=es&page=0&size=100',
      '/api/catalog/bestsellers?lang=es&page=1&size=100',
      '/api/catalog/bestsellers?lang=es&page=2&size=100',
    ]);
  });

  /** Con menos catálogo que cupo, seguir pidiendo páginas vacías sería girar en balde. */
  it('se para cuando el catálogo se acaba antes que el cupo', async () => {
    const { lee, caminos } = lector({ masVendidos: muchos(30) });

    const elegidas = await eligeLasFichas(lee, 500);

    expect(elegidas).toHaveLength(30);
    expect(caminos.filter((c) => c.includes('bestsellers'))).toHaveLength(2);
  });

  it('con cupo cero no pregunta nada al backend', async () => {
    const { lee, caminos } = lector({ masVendidos: muchos(10) });

    await expect(eligeLasFichas(lee, 0)).resolves.toEqual([]);
    expect(caminos).toEqual([]);
  });

  /** Un `slug` vacío o que no es texto generaría una ruta imposible: se descarta antes. */
  it('descarta lo que no sea un slug con contenido', async () => {
    const lee: LectorDeApi = (camino) =>
      Promise.resolve(
        camino.includes('/home/sections')
          ? { sections: [{ items: [{ slug: 'buena' }, { slug: '' }, { slug: 7 }, {}, null] }] }
          : { items: [] },
      );

    await expect(eligeLasFichas(lee, 10)).resolves.toEqual(['buena']);
  });

  it('aguanta que el backend conteste algo sin la forma esperada', async () => {
    const lee: LectorDeApi = () => Promise.resolve(null);

    await expect(eligeLasFichas(lee, 10)).resolves.toEqual([]);
  });

  /** El idioma de referencia del catálogo: es en el que se carga cada producto. */
  it('pide los títulos en castellano', async () => {
    const { lee, caminos } = lector({});

    await eligeLasFichas(lee, 1);

    expect(caminos[0]).toBe('/api/catalog/home/sections?lang=es&perSection=24');
  });
});

describe('lo que llama la ruta', () => {
  afterEach(() => vi.unstubAllGlobals());

  /**
   * Escribe SIEMPRE una línea con la cuenta. Es la única defensa contra el fallo característico de
   * este montaje: una compilación que sale en verde y sin ninguna ficha dentro.
   */
  it('anota cuántas fichas ha elegido', async () => {
    const { lee } = lector({ portada: portada(['a', 'b']) });
    const dichos: string[] = [];

    await expect(slugsAPrerenderizar(lee, 15, (m) => dichos.push(m))).resolves.toEqual(['a', 'b']);

    expect(dichos).toHaveLength(1);
    expect(dichos[0]).toContain('2 fichas');
  });

  it('avisa cuando el backend responde pero no trae ninguna ficha', async () => {
    const { lee } = lector({});
    const avisos: string[] = [];

    await expect(
      slugsAPrerenderizar(
        lee,
        15,
        () => undefined,
        (m) => avisos.push(m),
      ),
    ).resolves.toEqual([]);

    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toContain('ninguna ficha');
  });

  /**
   * Sin backend accesible NO se rompe la compilación: con la lista vacía y el `fallback`, las 7.729
   * fichas se ven exactamente como antes de este cambio. Pero se dice, y con el nombre de la variable
   * que hay que mirar.
   */
  it('sin backend avisa y devuelve la lista vacía en vez de tumbar el build', async () => {
    const { lee } = lector({ falla: 'home/sections' });
    const avisos: string[] = [];

    await expect(
      slugsAPrerenderizar(
        lee,
        15,
        () => undefined,
        (m) => avisos.push(m),
      ),
    ).resolves.toEqual([]);

    expect(avisos[0]).toContain('NEXADROP_API_INTERNA');
  });

  it('con cupo cero lo dice y no pregunta nada', async () => {
    const { lee, caminos } = lector({ portada: portada(['a']) });
    const dichos: string[] = [];

    await expect(slugsAPrerenderizar(lee, 0, (m) => dichos.push(m))).resolves.toEqual([]);

    expect(caminos).toEqual([]);
    expect(dichos[0]).toContain('ninguna ficha');
  });

  /** El lector de verdad: `fetch` contra el backend interno, y un estado que no sea 200 es un fallo. */
  it('el lector por defecto va por HTTP y trata como fallo lo que no sea 200', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve({ ok: false, status: 503, statusText: 'nope' }));
    const avisos: string[] = [];

    await expect(
      slugsAPrerenderizar(
        undefined,
        15,
        () => undefined,
        (m) => avisos.push(m),
      ),
    ).resolves.toEqual([]);

    expect(avisos[0]).toContain('503');
  });

  it('el lector por defecto devuelve el JSON del backend', async () => {
    const pedidas: string[] = [];
    vi.stubGlobal('fetch', (url: string) => {
      pedidas.push(url);
      return Promise.resolve({ ok: true, json: () => Promise.resolve(portada(['a'])) });
    });

    await expect(slugsAPrerenderizar(undefined, 1, () => undefined)).resolves.toEqual(['a']);

    expect(pedidas[0]).toMatch(/^https?:\/\/[^/]+\/api\/catalog\/home\/sections\?/);
  });
});
