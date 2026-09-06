import {
  BORRADOR_DE_CATEGORIA_VACIO,
  CategoriaAdmin,
  descendientes,
  estaVaciaYActiva,
  nombreDeCategoria,
  padresPosibles,
  paraExportar,
  rutaDeCategoria,
  saneaSlug,
  validaCategoria,
} from './categoria-admin';

const categoria = (
  id: string,
  slug: string,
  padreId: string | null = null,
  extra: Partial<CategoriaAdmin> = {},
): CategoriaAdmin => ({
  id,
  slug,
  nombreZh: `${slug}-zh`,
  nombres: { es: slug.toUpperCase(), en: slug },
  posicion: 0,
  activa: true,
  padreId,
  numeroDeProductos: 3,
  ...extra,
});

describe('categoria-admin', () => {
  it('el nombre cae del español al inglés, al chino y al slug', () => {
    expect(nombreDeCategoria(categoria('1', 'ropa'))).toBe('ROPA');
    expect(nombreDeCategoria(categoria('1', 'ropa', null, { nombres: { en: 'Clothes' } }))).toBe(
      'Clothes',
    );
    expect(
      nombreDeCategoria(categoria('1', 'ropa', null, { nombres: {}, nombreZh: '服装' })),
    ).toBe('服装');
  });

  it('el slug se fuerza al teclear en vez de rechazarse después', () => {
    expect(saneaSlug('Ropa de Niño')).toBe('ropa-de-ni-o');
  });

  describe('validaCategoria', () => {
    it('exige slug con formato y los dos idiomas con los que se opera', () => {
      expect(validaCategoria(BORRADOR_DE_CATEGORIA_VACIO)).toEqual({
        slug: 'slug_obligatorio',
        nombreEs: 'nombre_obligatorio',
        nombreEn: 'nombre_obligatorio',
      });
    });

    it('rechaza un slug con formato inválido', () => {
      const fallos = validaCategoria({
        ...BORRADOR_DE_CATEGORIA_VACIO,
        slug: '-ropa',
        nombreEs: 'Ropa',
        nombreEn: 'Clothes',
      });
      expect(fallos).toEqual({ slug: 'slug_formato' });
    });

    it('un borrador completo no tiene fallos', () => {
      const fallos = validaCategoria({
        slug: 'ropa',
        nombreZh: '',
        nombreEn: 'Clothes',
        nombreEs: 'Ropa',
        nombrePt: '',
        padreId: '',
      });
      expect(fallos).toEqual({});
    });
  });

  describe('rutaDeCategoria', () => {
    const todas = [categoria('1', 'moda'), categoria('2', 'ropa', '1'), categoria('3', 'top', '2')];
    const porId = new Map(todas.map((c) => [c.id, c] as const));

    it('compone la ruta completa desde la raíz', () => {
      expect(rutaDeCategoria(todas[2], porId)).toBe('MODA › ROPA › TOP');
    });

    /** Un ciclo en los padres colgaría el navegador; el guardián de visitados lo corta. */
    it('un ciclo en los padres no cuelga el navegador', () => {
      const a = categoria('a', 'a', 'b');
      const b = categoria('b', 'b', 'a');
      const conCiclo = new Map([
        ['a', a],
        ['b', b],
      ]);
      expect(rutaDeCategoria(a, conCiclo)).toBe('B › A');
    });
  });

  it('los descendientes incluyen a los nietos', () => {
    const todas = [categoria('1', 'moda'), categoria('2', 'ropa', '1'), categoria('3', 'top', '2')];
    expect([...descendientes('1', todas)].sort()).toEqual(['2', '3']);
  });

  /** Ser hija de su propia nieta crea un ciclo del que el menú no sale. */
  it('los padres posibles excluyen a la propia y a su descendencia', () => {
    const todas = [categoria('1', 'moda'), categoria('2', 'ropa', '1'), categoria('3', 'top', '2')];
    expect(padresPosibles(todas, '1').map((c) => c.id)).toEqual([]);
    expect(padresPosibles(todas, '3').map((c) => c.id).sort()).toEqual(['1', '2']);
  });

  it('distingue la categoría activa pero vacía, que deja un hueco en el menú', () => {
    expect(estaVaciaYActiva(categoria('1', 'a', null, { numeroDeProductos: 0 }))).toBe(true);
    expect(estaVaciaYActiva(categoria('1', 'a'))).toBe(false);
    expect(
      estaVaciaYActiva(categoria('1', 'a', null, { activa: false, numeroDeProductos: 0 })),
    ).toBe(false);
  });

  /** Los identificadores no sobreviven al cruzar de entorno; el slug sí. */
  it('la exportación referencia al padre por slug, no por identificador', () => {
    const todas = [categoria('1', 'moda'), categoria('2', 'ropa', '1')];
    const filas = paraExportar(todas);
    expect(filas[1].parentSlug).toBe('moda');
    expect(filas[0].parentSlug).toBeUndefined();
    expect(filas[0].nameEs).toBe('MODA');
  });
});
