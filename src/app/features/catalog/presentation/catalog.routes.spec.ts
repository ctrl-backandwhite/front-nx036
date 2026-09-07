import { PrerenderFallback, RenderMode, ServerRoutePrerenderWithParams } from '@angular/ssr';
import { Route } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { rutas } from './catalog.routes';
import { rutasDeServidor } from './catalog.server-routes';

/** Las hijas del bloque con proveedores: es donde viven de verdad las pantallas. */
const pantallas: Route[] = rutas[0].children ?? [];

function pantalla(camino: string): Route | undefined {
  return pantallas.find((ruta) => ruta.path === camino);
}

describe('rutas de catálogo', () => {
  it('cubre las cinco pantallas del contexto', () => {
    expect(pantallas.map((ruta) => ruta.path)).toEqual([
      '',
      'catalog',
      'catalog/:slug',
      'favorites',
      'history',
    ]);
  });

  /** Quien entra a su cuenta no tiene por qué descargarse los adaptadores del catálogo. */
  it('los proveedores cuelgan de las rutas, no del arranque', () => {
    expect(rutas[0].providers).toHaveLength(1);
  });

  it('todas las pantallas se cargan en diferido y resuelven su componente', async () => {
    for (const ruta of pantallas) {
      expect(ruta.loadComponent, `sin carga diferida: ${ruta.path}`).toBeTypeOf('function');
      const componente = await (ruta.loadComponent as () => Promise<unknown>)();
      expect(componente, `no resuelve: ${ruta.path}`).toBeTypeOf('function');
    }
  });

  /** El listado y la ficha son las dos rutas que más se visitan: su código se adelanta de fondo. */
  it('marca para precarga las dos rutas que más se visitan', () => {
    expect(pantalla('catalog')?.data?.['precarga']).toBe(true);
    expect(pantalla('catalog/:slug')?.data?.['precarga']).toBe(true);
    expect(pantalla('favorites')?.data?.['precarga']).toBeUndefined();
  });
});

describe('rutas de servidor', () => {
  function modo(camino: string): RenderMode | undefined {
    return rutasDeServidor.find((ruta) => ruta.path === camino)?.renderMode;
  }

  /** La portada es pública y la misma para todo el mundo: conviene que llegue ya pintada. */
  it('la portada se escribe al construir', () => {
    expect(modo('')).toBe(RenderMode.Prerender);
  });

  /**
   * El listado, los favoritos y el historial dependen de quién mira —cuenta, filtros, orden barajado—:
   * prerenderizarlos dejaría cacheado en el borde el esqueleto de una lista personal.
   */
  it('lo que depende de quién mira lo monta el navegador', () => {
    for (const camino of ['catalog', 'favorites', 'history']) {
      expect(modo(camino), camino).toBe(RenderMode.Client);
    }
  });

  describe('la ficha', () => {
    const ficha = rutasDeServidor.find(
      (ruta) => ruta.path === 'catalog/:slug',
    ) as ServerRoutePrerenderWithParams;

    it('se escribe al construir', () => {
      expect(ficha.renderMode).toBe(RenderMode.Prerender);
    });

    /**
     * Es la mitad que garantiza que no se rompe nada: con 7.729 productos solo entra un cupo, y lo
     * que queda fuera —incluido lo que se cargue DESPUÉS de compilar— tiene que seguir viéndose. Y
     * tiene que ser `Client`, no `Server`: aquí no hay servidor Node al que caer.
     */
    it('deja en manos del navegador todo lo que no entre en el cupo', () => {
      expect(ficha.fallback).toBe(PrerenderFallback.Client);
    });

    /**
     * La trampa conocida: una ruta con parámetro en `Prerender` SIN esta función tumba la compilación
     * en seco con «getPrerenderParams is missing». Ya pasó una vez y dejó el repositorio sin poder
     * construirse.
     */
    it('declara de dónde salen los parámetros', () => {
      expect(ficha.getPrerenderParams).toBeTypeOf('function');
    });

    afterEach(() => vi.unstubAllGlobals());

    /** Lo que devuelve tiene que ser la forma que espera Angular: un objeto por ruta, con su `slug`. */
    it('devuelve un objeto por ficha, con la clave del parámetro', async () => {
      vi.stubGlobal('fetch', () =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({ sections: [{ items: [{ slug: 'una' }, { slug: 'otra' }] }] }),
        }),
      );

      const parametros = await ficha.getPrerenderParams();

      expect(parametros).toEqual([{ slug: 'una' }, { slug: 'otra' }]);
    });

    /**
     * Sin backend accesible NO se rompe la compilación: se devuelve la lista vacía y, con el
     * `fallback`, las 7.729 fichas se ven exactamente como antes de este cambio.
     */
    it('sin backend devuelve la lista vacía en vez de tumbar el build', async () => {
      vi.stubGlobal('fetch', () => Promise.reject(new Error('sin red')));
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);

      await expect(ficha.getPrerenderParams()).resolves.toEqual([]);
    });
  });
});
