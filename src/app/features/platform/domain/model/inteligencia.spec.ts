import {
  TendenciaDeAnuncio,
  maximoDeInteracciones,
  puntuacionSobreCien,
  resumePorFuente,
  umbralNormalizado,
} from './inteligencia';

function tendencia(
  id: string,
  fuente: string,
  interacciones?: number,
): TendenciaDeAnuncio {
  return {
    id,
    fuente,
    titular: `Titular ${id}`,
    interacciones,
    capturadaEl: '2026-09-01T00:00:00Z',
  };
}

describe('puntuacionSobreCien', () => {
  it('pasa la escala de 0 a 1 a la de 0 a 100', () => {
    expect(puntuacionSobreCien(0.892)).toBe(89);
    expect(puntuacionSobreCien(1)).toBe(100);
    expect(puntuacionSobreCien(0)).toBe(0);
  });

  it('deja como está lo que ya viene en la escala grande', () => {
    // Hay filas antiguas guardadas de 0 a 100: multiplicarlas otra vez pintaba «6000/100».
    expect(puntuacionSobreCien(60)).toBe(60);
    expect(puntuacionSobreCien(99.4)).toBe(99);
  });

  it('recorta arriba y abajo: ningún dato torcido sale de la escala', () => {
    expect(puntuacionSobreCien(6000)).toBe(100);
    expect(puntuacionSobreCien(-3)).toBe(0);
  });

  it('trata la ausencia y lo que no es número como cero', () => {
    expect(puntuacionSobreCien(undefined)).toBe(0);
    expect(puntuacionSobreCien(null)).toBe(0);
    expect(puntuacionSobreCien(Number.NaN)).toBe(0);
  });
});

describe('umbralNormalizado', () => {
  it('pasa lo tecleado de 0 a 100 a lo que guarda el backend, de 0 a 1', () => {
    expect(umbralNormalizado('75')).toBe(0.75);
    expect(umbralNormalizado(50)).toBe(0.5);
  });

  it('recorta: un umbral de 900 sería una alerta que no salta nunca', () => {
    expect(umbralNormalizado('900')).toBe(1);
    expect(umbralNormalizado('-10')).toBe(0);
  });

  it('un campo vacío o con letras vale cero, no NaN', () => {
    expect(umbralNormalizado('')).toBe(0);
    expect(umbralNormalizado('mucho')).toBe(0);
  });
});

describe('resumePorFuente', () => {
  it('agrupa por fuente sumando anuncios e interacciones', () => {
    const resumen = resumePorFuente([
      tendencia('1', 'tiktok', 100),
      tendencia('2', 'tiktok', 50),
      tendencia('3', 'amazon', 10),
    ]);

    expect(resumen).toEqual([
      { fuente: 'tiktok', cuantos: 2, interacciones: 150 },
      { fuente: 'amazon', cuantos: 1, interacciones: 10 },
    ]);
  });

  it('agrupa bajo un guion lo que llega sin fuente', () => {
    const resumen = resumePorFuente([tendencia('1', '')]);
    expect(resumen).toEqual([{ fuente: '—', cuantos: 1, interacciones: 0 }]);
  });

  it('sin tendencias no hay resumen', () => {
    expect(resumePorFuente([])).toEqual([]);
  });
});

describe('maximoDeInteracciones', () => {
  it('devuelve el mayor total', () => {
    expect(
      maximoDeInteracciones([
        { fuente: 'a', cuantos: 1, interacciones: 30 },
        { fuente: 'b', cuantos: 1, interacciones: 90 },
      ]),
    ).toBe(90);
  });

  it('nunca baja de uno: es el divisor de la barra y cero daba una anchura NaN', () => {
    expect(maximoDeInteracciones([])).toBe(1);
    expect(maximoDeInteracciones([{ fuente: 'a', cuantos: 3, interacciones: 0 }])).toBe(1);
  });
});
