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

  it('todas las pantallas se cargan en diferido y resuelven su componente', async () => {
    for (const ruta of pantallas) {
      expect(ruta.loadComponent, `sin carga diferida: ${ruta.path}`).toBeTypeOf('function');
      const componente = await (ruta.loadComponent as () => Promise<unknown>)();
      expect(componente, `no resuelve: ${ruta.path}`).toBeTypeOf('function');
    }
  });

  /**
   * Qué pantallas del catálogo exigen cuenta.
   *
   * <p>La FICHA entra en la lista: enseña el precio con margen, el desglose de aranceles y el
   * proveedor. Antes se llegaba a ella escribiendo la dirección aunque el listado sí estuviera
   * cerrado, que es la forma más tonta de dejar abierta una pantalla que se creía cerrada.
   */
  it('las pantallas internas exigen cuenta', () => {
    for (const camino of ['catalog', 'catalog/:slug', 'favorites', 'history']) {
      expect(pantalla(camino)?.canActivate, camino).toBeDefined();
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

  /**
   * La FICHA la monta el navegador desde que exige cuenta.
   *
   * <p>Antes se escribía al construir un cupo de las más compartidas. Eso ahora sería contradecir la
   * decisión: nginx sirve el HTML escrito al compilar a quien pida la dirección, sin pasar por ningún
   * guardián —el guardián vive en el navegador y actúa DESPUÉS—, así que la ficha quedaría cerrada en
   * la aplicación y abierta en el borde. Cerrar una pantalla y dejar su HTML público no es cerrarla.
   */
  it('la ficha la monta el navegador, no se escribe al construir', () => {
    expect(modo('catalog/:slug')).toBe(RenderMode.Client);
  });

  /** Y no queda rastro del cupo: una ruta con parámetro en «Prerender» exige `getPrerenderParams`. */
  it('la ficha ya no declara parámetros de prerenderizado', () => {
    const ficha = rutasDeServidor.find((r) => r.path === 'catalog/:slug');

    expect(ficha).toBeDefined();
    expect('getPrerenderParams' in (ficha ?? {})).toBe(false);
  });
});
