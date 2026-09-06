import { RenderMode } from '@angular/ssr';
import { Route } from '@angular/router';
import { describe, expect, it } from 'vitest';
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

  it('todas las pantallas se cargan en diferido', () => {
    for (const ruta of pantallas) {
      expect(ruta.loadComponent, `sin carga diferida: ${ruta.path}`).toBeTypeOf('function');
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
   * Lo demás depende de quién mira —idioma, divisa, cesta, cuenta—: prerenderizarlo dejaría cacheado
   * en el borde el esqueleto de una lista personal.
   */
  it('lo que depende de quién mira lo monta el navegador', () => {
    for (const camino of ['catalog', 'catalog/:slug', 'favorites', 'history']) {
      expect(modo(camino), camino).toBe(RenderMode.Client);
    }
  });
});
