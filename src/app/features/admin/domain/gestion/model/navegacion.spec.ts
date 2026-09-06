import { MAPA_DEL_PANEL, agrupaPorSeccion, filtraElMapa } from './navegacion';

/** Traduce la clave a su última pieza: basta para probar el mecanismo sin cargar los diccionarios. */
const t = (clave: string): string => clave.split('.').pop() ?? clave;

describe('MAPA_DEL_PANEL', () => {
  it('todas las entradas apuntan dentro del panel y no hay destinos repetidos', () => {
    const destinos = MAPA_DEL_PANEL.map((e) => e.destino);

    expect(destinos.every((d) => d.startsWith('/admin/'))).toBe(true);
    expect(new Set(destinos).size).toBe(destinos.length);
  });

  /** Los rótulos son CLAVES, no texto: esta lista se pinta en ocho idiomas. */
  it('los rótulos y las secciones son claves de traducción', () => {
    expect(MAPA_DEL_PANEL.every((e) => e.etiqueta.includes('.'))).toBe(true);
    expect(MAPA_DEL_PANEL.every((e) => e.seccion.includes('.'))).toBe(true);
  });
});

describe('filtraElMapa', () => {
  it('sin texto devuelve el índice entero, que es lo que se ve al abrir', () => {
    expect(filtraElMapa(MAPA_DEL_PANEL, '   ', t)).toBe(MAPA_DEL_PANEL);
  });

  it('busca por el texto TRADUCIDO del rótulo, no por la clave', () => {
    const encontrados = filtraElMapa(MAPA_DEL_PANEL, 'users', t);

    expect(encontrados).toHaveLength(1);
    expect(encontrados[0].destino).toBe('/admin/users');
  });

  it('busca también por la sección', () => {
    const encontrados = filtraElMapa(MAPA_DEL_PANEL, 'finance', t);

    expect(encontrados.map((e) => e.destino)).toEqual(['/admin/billing', '/admin/wallets']);
  });

  it('sin coincidencias devuelve la lista vacía', () => {
    expect(filtraElMapa(MAPA_DEL_PANEL, 'zzzz', t)).toEqual([]);
  });
});

describe('agrupaPorSeccion', () => {
  it('agrupa conservando el orden en que aparecen las secciones', () => {
    const grupos = agrupaPorSeccion(MAPA_DEL_PANEL);

    expect(grupos[0].seccion).toBe('admin.section.catalog');
    expect(grupos[0].entradas.length).toBeGreaterThan(1);
    // Ninguna sección aparece dos veces, aunque sus entradas no estén seguidas.
    expect(new Set(grupos.map((g) => g.seccion)).size).toBe(grupos.length);
  });

  it('con la lista vacía no inventa grupos', () => {
    expect(agrupaPorSeccion([])).toEqual([]);
  });
});
