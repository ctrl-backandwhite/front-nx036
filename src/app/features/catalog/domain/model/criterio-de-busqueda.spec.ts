import { describe, expect, it } from 'vitest';
import {
  BARAJAS,
  CRITERIO_VACIO,
  GRUPO_DEL_CARRITO,
  aParametros,
  barajaEfectiva,
  categoriaValida,
  cuantosFiltros,
  desdeParametros,
  otraBaraja,
} from './criterio-de-busqueda';

const UUID = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';

describe('desdeParametros y aParametros', () => {
  it('un enlace compartido llega con sus filtros puestos', () => {
    const criterio = desdeParametros(
      new URLSearchParams(`q=gorro&categoryId=${UUID}&freeShipping=1&sort=newest&grupo=abc`),
    );
    expect(criterio.texto).toBe('gorro');
    expect(criterio.categoria).toBe(UUID);
    expect(criterio.envioGratis).toBe(true);
    expect(criterio.orden).toBe('newest');
    expect(criterio.grupoDeArancel).toBe('abc');
  });

  it('un orden inventado cae al de por defecto', () => {
    expect(desdeParametros(new URLSearchParams('sort=lo-que-sea')).orden).toBe('random');
  });

  it('ida y vuelta: lo que se escribe en la dirección se vuelve a leer igual', () => {
    const original = desdeParametros(
      new URLSearchParams('q=gorro&minPrice=5&maxPrice=20&hasVideo=1&verified=true&promotionId=p1&promo=Rebajas'),
    );
    const vuelta = desdeParametros(new URLSearchParams(aParametros(original)));
    expect(vuelta).toEqual(original);
  });

  /** El orden por defecto NO se escribe: si no, «limpiar» dejaba un distintivo imposible de quitar. */
  it('el orden por defecto no ensucia la dirección', () => {
    expect(aParametros(CRITERIO_VACIO)).toEqual({});
  });

  it('el nombre de la promoción no viaja suelto: sin identificador no filtra nada', () => {
    const parametros = aParametros({ ...CRITERIO_VACIO, nombreDePromocion: 'Rebajas' });
    expect(parametros['promo']).toBeUndefined();
  });
});

describe('cuantosFiltros', () => {
  it('no cuenta el orden por defecto', () => {
    expect(cuantosFiltros(CRITERIO_VACIO)).toBe(0);
  });

  it('cuenta cada filtro puesto, incluido el grupo de arancel que llega de fuera', () => {
    expect(
      cuantosFiltros({
        ...CRITERIO_VACIO,
        texto: 'gorro',
        envioGratis: true,
        orden: 'newest',
        grupoDeArancel: GRUPO_DEL_CARRITO,
      }),
    ).toBe(4);
  });
});

describe('categoriaValida', () => {
  /** Un enlace antiguo con un slug donde va un identificador dejaba la pantalla cargando para siempre. */
  it('rechaza lo que no sea un identificador', () => {
    expect(categoriaValida('moda-mujer')).toBe(false);
    expect(categoriaValida(UUID)).toBe(true);
    expect(categoriaValida(undefined)).toBe(true);
  });
});

describe('otraBaraja', () => {
  it('nunca repite la anterior: refrescar y ver lo mismo no parecería un refresco', () => {
    const valores = [0.1, 0.1, 0.9];
    let i = 0;
    const anterior = Math.floor(0.1 * BARAJAS);
    expect(otraBaraja(anterior, () => valores[i++] ?? 0.5)).not.toBe(anterior);
  });

  it('no se queda dando vueltas si el azar siempre da lo mismo', () => {
    const fija = Math.floor(0.5 * BARAJAS);
    expect(otraBaraja(fija, () => 0.5)).toBe(fija);
  });
});

describe('barajaEfectiva', () => {
  /** Barajar el desempate mezclaría resultados que el buscador ya ordenó por relevancia. */
  it('con búsqueda por texto no se baraja', () => {
    expect(barajaEfectiva({ ...CRITERIO_VACIO, texto: 'gorro' }, 7)).toBeUndefined();
  });

  it('sin texto, se usa la baraja de la visita', () => {
    expect(barajaEfectiva(CRITERIO_VACIO, 7)).toBe(7);
    expect(barajaEfectiva(CRITERIO_VACIO, null)).toBeUndefined();
  });
});
