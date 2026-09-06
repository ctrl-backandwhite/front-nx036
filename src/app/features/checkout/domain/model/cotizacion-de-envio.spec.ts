import {
  OpcionDeEnvio,
  categoriaDeOpcion,
  laMasBarata,
  laMasRapida,
} from './cotizacion-de-envio';

function opcion(parcial: Partial<OpcionDeEnvio> & { codigo: string }): OpcionDeEnvio {
  return {
    importeParaComparar: 1000,
    importeFormateado: '10,00 €',
    diasMinimos: 8,
    diasMaximos: 15,
    ...parcial,
  };
}

describe('laMasBarata', () => {
  it('es la de menor importe', () => {
    const opciones = [
      opcion({ codigo: 'A', importeParaComparar: 832 }),
      opcion({ codigo: 'B', importeParaComparar: 705 }),
    ];

    expect(laMasBarata(opciones).codigo).toBe('B');
  });

  it('ante empate se queda con la primera que cotizó', () => {
    const opciones = [
      opcion({ codigo: 'A', importeParaComparar: 700 }),
      opcion({ codigo: 'B', importeParaComparar: 700 }),
    ];

    expect(laMasBarata(opciones).codigo).toBe('A');
  });
});

describe('laMasRapida', () => {
  it('manda el plazo máximo', () => {
    const opciones = [
      opcion({ codigo: 'A', diasMaximos: 15 }),
      opcion({ codigo: 'B', diasMaximos: 9 }),
    ];

    expect(laMasRapida(opciones).codigo).toBe('B');
  });

  it('a igual plazo máximo, la que empieza antes', () => {
    const opciones = [
      opcion({ codigo: 'A', diasMinimos: 8, diasMaximos: 12 }),
      opcion({ codigo: 'B', diasMinimos: 5, diasMaximos: 12 }),
    ];

    expect(laMasRapida(opciones).codigo).toBe('B');
  });

  it('a igual plazo, la más barata', () => {
    const opciones = [
      opcion({ codigo: 'A', importeParaComparar: 900 }),
      opcion({ codigo: 'B', importeParaComparar: 700 }),
    ];

    expect(laMasRapida(opciones).codigo).toBe('B');
  });
});

/**
 * «Económico» es una palabra sobre dinero. Llamar así a la opción MÁS CARA pasó en producción —8,32 €
 * frente a 7,05 €— y destruye la confianza en el resto de la pantalla.
 */
describe('categoriaDeOpcion', () => {
  const opciones = [
    opcion({ codigo: 'BARATA', importeParaComparar: 705, diasMaximos: 20 }),
    opcion({ codigo: 'RAPIDA', importeParaComparar: 1500, diasMaximos: 5 }),
    opcion({ codigo: 'MEDIA', importeParaComparar: 900, diasMaximos: 12 }),
  ];

  it('la más barata es la económica, aunque tarde más', () => {
    expect(categoriaDeOpcion(opciones[0], opciones)).toBe('economy');
  });

  it('la más rápida es la exprés', () => {
    expect(categoriaDeOpcion(opciones[1], opciones)).toBe('express');
  });

  it('las demás son estándar', () => {
    expect(categoriaDeOpcion(opciones[2], opciones)).toBe('standard');
  });

  /** Nombrar «la más barata» a la única de la lista es una comparación consigo misma. */
  it('con una sola opción no hay comparación: es estándar', () => {
    expect(categoriaDeOpcion(opciones[0], [opciones[0]])).toBe('standard');
  });

  it('si la más barata es además la más rápida, gana el nombre económico', () => {
    const dos = [
      opcion({ codigo: 'A', importeParaComparar: 500, diasMaximos: 4 }),
      opcion({ codigo: 'B', importeParaComparar: 900, diasMaximos: 12 }),
    ];

    expect(categoriaDeOpcion(dos[0], dos)).toBe('economy');
  });
});
