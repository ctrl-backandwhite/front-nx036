import { paginaVacia, paginasAlMenosUna } from './pagina';

describe('paginaVacia', () => {
  it('deja una página en blanco pero VÁLIDA, para no llenar las plantillas de condicionales', () => {
    const pagina = paginaVacia<string>();

    expect(pagina.elementos).toEqual([]);
    expect(pagina.total).toBe(0);
    // Uno, no cero: un listado vacío sigue siendo «página 1 de 1».
    expect(pagina.paginas).toBe(1);
  });
});

describe('paginasAlMenosUna', () => {
  it('nunca devuelve menos de una', () => {
    expect(paginasAlMenosUna(0)).toBe(1);
    expect(paginasAlMenosUna(undefined)).toBe(1);
    expect(paginasAlMenosUna(-3)).toBe(1);
  });

  it('respeta el número real cuando lo hay', () => {
    expect(paginasAlMenosUna(7)).toBe(7);
  });
});
